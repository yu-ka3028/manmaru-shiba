module Webhooks
  class LineController < ApplicationController
    before_action :verify_signature

    def receive
      events = client.parse_events_from(request.raw_post)

      events.each do |event|
        case event
        when Line::Bot::Event::Follow
          handle_follow(event)
        when Line::Bot::Event::Message
          handle_message(event)
        end
      end

      head :ok
    end

    private

    def verify_signature
      signature = request.headers["X-Line-Signature"]
      unless client.validate_signature(request.raw_post, signature)
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
