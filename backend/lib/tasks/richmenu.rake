# frozen_string_literal: true

namespace :richmenu do
  desc "Create LINE Rich Menu with postback buttons and set as default"
  task create: :environment do
    require "net/http"
    require "json"

    token         = ENV.fetch("LINE_CHANNEL_ACCESS_TOKEN")
    liff_base_url = ENV.fetch("LIFF_BASE_URL")

    # 既存のリッチメニューを削除
    existing = line_get("https://api.line.me/v2/bot/richmenu/list", token)
    Array(existing["richmenus"]).each do |menu|
      line_delete("https://api.line.me/v2/bot/richmenu/#{menu['richMenuId']}", token)
      puts "Deleted: #{menu['richMenuId']}"
    end

    body = {
      size: { width: 2500, height: 843 },
      selected: true,
      name: "ケア記録メニュー",
      chatBarText: "メニュー",
      areas: [
        {
          bounds: { x: 0,    y: 0,   width: 833, height: 421 },
          action: { type: "postback", label: "ごはん",   data: "care_type=meal", displayText: "ごはん🍚" }
        },
        {
          bounds: { x: 833,  y: 0,   width: 833, height: 421 },
          action: { type: "postback", label: "うんち",   data: "care_type=poop", displayText: "うんち💩" }
        },
        {
          bounds: { x: 1666, y: 0,   width: 834, height: 421 },
          action: { type: "postback", label: "おしっこ", data: "care_type=pee",  displayText: "おしっこ💧" }
        },
        {
          bounds: { x: 0,    y: 421, width: 833, height: 422 },
          action: { type: "postback", label: "さんぽ",   data: "action=walk_select",  displayText: "散歩🦮" }
        },
        {
          bounds: { x: 833,  y: 421, width: 833, height: 422 },
          action: { type: "postback", label: "なう。",   data: "action=status_check", displayText: "状態確認📋" }
        },
        {
          bounds: { x: 1666, y: 421, width: 834, height: 422 },
          action: { type: "uri", label: "まんまる柴", uri: liff_base_url }
        }
      ]
    }.to_json

    puts "Creating Rich Menu..."
    result       = line_post("https://api.line.me/v2/bot/richmenu", token, body: body, content_type: "application/json")
    rich_menu_id = result.fetch("richMenuId")
    puts "✓ Created: #{rich_menu_id}"

    puts "Uploading image..."
    png = File.binread(Rails.root.join("lib/tasks/richmenu.png"))
    line_post("https://api-data.line.me/v2/bot/richmenu/#{rich_menu_id}/content", token, body: png, content_type: "image/png")
    puts "✓ Image uploaded"

    puts "Setting as default..."
    line_post("https://api.line.me/v2/bot/user/all/richmenu/#{rich_menu_id}", token)
    puts "✓ Set as default"

    puts "\nComplete! Rich Menu ID: #{rich_menu_id}"
  end
end

# ── LINE API helpers ─────────────────────────────────────────────────────────

def line_get(url, token)
  uri = URI(url)
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true
  req = Net::HTTP::Get.new(uri)
  req["Authorization"] = "Bearer #{token}"
  res = http.request(req)
  JSON.parse(res.body)
rescue JSON::ParserError
  {}
end

def line_delete(url, token)
  uri = URI(url)
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true
  req = Net::HTTP::Delete.new(uri)
  req["Authorization"] = "Bearer #{token}"
  http.request(req)
end

def line_post(url, token, body: nil, content_type: nil)
  uri = URI(url)
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true
  req = Net::HTTP::Post.new(uri)
  req["Authorization"] = "Bearer #{token}"
  req["Content-Type"]  = content_type if content_type
  req.body = body if body
  res = http.request(req)
  return {} if res.is_a?(Net::HTTPNoContent)
  raise "LINE API error #{res.code}: #{res.body}" unless res.is_a?(Net::HTTPSuccess)
  JSON.parse(res.body)
rescue JSON::ParserError
  {}
end
