# frozen_string_literal: true

namespace :richmenu do
  desc "Create LINE Rich Menu with postback buttons and set as default"
  task create: :environment do
    require "net/http"
    require "json"
    require "zlib"

    token         = ENV.fetch("LINE_CHANNEL_ACCESS_TOKEN")
    liff_base_url = ENV.fetch("LIFF_BASE_URL")

    body = {
      size: { width: 2500, height: 843 },
      selected: true,
      name: "ケア記録メニュー",
      chatBarText: "メニュー",
      areas: [
        {
          bounds: { x: 0,    y: 0,   width: 833, height: 421 },
          action: { type: "postback", label: "おしっこ", data: "care_type=pee",  displayText: "おしっこ💧" }
        },
        {
          bounds: { x: 833,  y: 0,   width: 833, height: 421 },
          action: { type: "postback", label: "うんち",   data: "care_type=poop", displayText: "うんち💩" }
        },
        {
          bounds: { x: 1666, y: 0,   width: 834, height: 421 },
          action: { type: "postback", label: "ごはん",   data: "care_type=meal", displayText: "ごはん🍚" }
        },
        {
          bounds: { x: 0,    y: 421, width: 833, height: 422 },
          action: { type: "postback", label: "散歩",     data: "action=walk_select",   displayText: "散歩🦮" }
        },
        {
          bounds: { x: 833,  y: 421, width: 833, height: 422 },
          action: { type: "postback", label: "状態確認", data: "action=status_check",  displayText: "状態確認📋" }
        },
        {
          bounds: { x: 1666, y: 421, width: 834, height: 422 },
          action: { type: "uri", label: "タイムライン", uri: "#{liff_base_url}/timeline" }
        }
      ]
    }.to_json

    # Step 1: Create Rich Menu
    puts "Creating Rich Menu..."
    result = line_post("https://api.line.me/v2/bot/richmenu", token, body: body, content_type: "application/json")
    rich_menu_id = result.fetch("richMenuId")
    puts "✓ Created: #{rich_menu_id}"

    # Step 2: Upload image (solid color PNG)
    puts "Uploading image..."
    png = richmenu_png(2500, 843)
    line_post("https://api-data.line.me/v2/bot/richmenu/#{rich_menu_id}/content", token, body: png, content_type: "image/png")
    puts "✓ Image uploaded"

    # Step 3: Set as default for all users
    puts "Setting as default..."
    line_post("https://api.line.me/v2/bot/user/all/richmenu/#{rich_menu_id}", token)
    puts "✓ Set as default"

    puts "\nComplete! Rich Menu ID: #{rich_menu_id}"
  end
end

def line_post(url, token, body: nil, content_type: nil)
  uri  = URI(url)
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

def richmenu_png(width, height)
  row        = "\x00".b + ("\xF5\xF0\xE8".b * width)
  raw        = row * height
  compressed = Zlib::Deflate.deflate(raw.b)

  ihdr_data  = [width, height, 8, 2, 0, 0, 0].pack("NNCCCCC")
  ihdr       = png_chunk("IHDR", ihdr_data)
  idat       = png_chunk("IDAT", compressed)
  iend       = png_chunk("IEND", "".b)

  ("\x89PNG\r\n\x1a\n".b + ihdr + idat + iend).b
end

def png_chunk(type, data)
  type_b = type.encode("ASCII").b
  data_b = data.b
  crc    = Zlib.crc32(type_b + data_b)
  ([data_b.bytesize].pack("N") + type_b + data_b + [crc].pack("N")).b
end
