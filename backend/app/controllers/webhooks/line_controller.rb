module Webhooks
  class LineController < ApplicationController
    before_action :verify_signature

    CARE_TYPE_LABELS = {
      "meal"       => "ごはん",
      "walk_short" => "散歩（ショート）",
      "walk_long"  => "散歩（ロング）",
      "pee"        => "おしっこ",
      "poop"       => "うんち"
    }.freeze

    def receive
      events = client.parse_events_from(request.body.read)

      events.each do |event|
        case event
        when Line::Bot::Event::Follow
          handle_follow(event)
        when Line::Bot::Event::Message
          handle_message(event)
        when Line::Bot::Event::Postback
          handle_postback(event)
        end
      end

      head :ok
    end

    private

    def verify_signature
      body = request.body.read
      request.body.rewind

      signature = request.headers["X-Line-Signature"]
      unless client.validate_signature(body, signature)
        head :bad_request and return
      end
    end

    def handle_follow(event)
      line_user_id = event["source"]["userId"]
      profile = fetch_profile(line_user_id)
      return unless profile

      user = User.find_or_create_by(line_user_id: line_user_id) do |u|
        u.display_name = profile["displayName"]
        u.picture_url = profile["pictureUrl"]
      end

      send_setup_link(line_user_id, user)
    end

    def handle_message(event)
      line_user_id = event["source"]["userId"]
      client.reply_message(event["replyToken"], {
        type: "text",
        text: "ボタンからご記録ください 🐾"
      })
    end

    def handle_postback(event)
      line_user_id = event["source"]["userId"]
      data = Rack::Utils.parse_query(event.dig("postback", "data"))

      user = User.find_by(line_user_id: line_user_id)
      return unless user

      if data["action"] == "walk_select"
        reply_walk_quick_reply(event["replyToken"])
        return
      end

      care_type = data["care_type"]
      return unless CareRecord::CARE_TYPES.include?(care_type)

      # dog_idはLINEのQuick Replyで犬を選んだときにpostback.dataに付与される。
      # 多頭飼いの場合は一度reply_dog_select_quick_replyで犬選択をLINEに問い合わせ、
      # ユーザーが選択した後に改めてdog_id付きのpostbackが来る。
      dog_id = data["dog_id"]
      if dog_id.present?
        dog = user.dogs.find_by(id: dog_id)
        return unless dog
        create_care_record_and_reply(event["replyToken"], user, dog, care_type)
      else
        dogs = user.dogs
        if dogs.count == 1
          dog = dogs.first
          create_care_record_and_reply(event["replyToken"], user, dog, care_type)
        else
          reply_dog_select_quick_reply(event["replyToken"], dogs, care_type)
        end
      end
    end

    def create_care_record_and_reply(reply_token, user, dog, care_type)
      CareRecord.create!(
        dog: dog,
        user: user,
        care_type: care_type,
        recorded_at: Time.current
      )

      label = CARE_TYPE_LABELS[care_type]
      time_str = Time.current.strftime("%H:%M")
      client.reply_message(reply_token, {
        type: "text",
        text: "#{dog.name}：#{label}を記録しました（#{time_str}）🐾"
      })
    end

    def reply_walk_quick_reply(reply_token)
      client.reply_message(reply_token, {
        type: "text",
        text: "どちらのコースでしたか？",
        quickReply: {
          items: [
            quick_reply_postback("ショートコース", "care_type=walk_short"),
            quick_reply_postback("ロングコース",   "care_type=walk_long")
          ]
        }
      })
    end

    def reply_dog_select_quick_reply(reply_token, dogs, care_type)
      items = dogs.map do |dog|
        quick_reply_postback(dog.name, "care_type=#{care_type}&dog_id=#{dog.id}")
      end

      client.reply_message(reply_token, {
        type: "text",
        text: "どの子の記録ですか？",
        quickReply: { items: items }
      })
    end

    def quick_reply_postback(label, data)
      {
        type: "action",
        action: { type: "postback", label: label, data: data, displayText: label }
      }
    end

    def fetch_profile(line_user_id)
      response = client.get_profile(line_user_id)
      return nil unless response.is_a?(Net::HTTPOK)
      JSON.parse(response.body)
    end

    def send_setup_link(line_user_id, user)
      liff_url = "#{ENV.fetch('LIFF_BASE_URL')}/setup"
      client.push_message(line_user_id, {
        type: "text",
        text: "まるのお世話へようこそ！\nセットアップはこちら 👇\n#{liff_url}"
      })
    end

    def client
      @client ||= Line::Bot::Client.new do |config|
        config.channel_secret = ENV.fetch("LINE_CHANNEL_SECRET")
        config.channel_token = ENV.fetch("LINE_CHANNEL_ACCESS_TOKEN")
      end
    end
  end
end
