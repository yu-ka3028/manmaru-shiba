# frozen_string_literal: true

namespace :richmenu do
  desc "Create LINE Rich Menu with postback buttons and set as default"
  task create: :environment do
    require "net/http"
    require "json"
    require "zlib"

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
          action: { type: "postback", label: "散歩",     data: "action=walk_select",  displayText: "散歩🦮" }
        },
        {
          bounds: { x: 833,  y: 421, width: 833, height: 422 },
          action: { type: "postback", label: "状態確認", data: "action=status_check", displayText: "状態確認📋" }
        },
        {
          bounds: { x: 1666, y: 421, width: 834, height: 422 },
          action: { type: "uri", label: "タイムライン", uri: "#{liff_base_url}/timeline" }
        }
      ]
    }.to_json

    puts "Creating Rich Menu..."
    result       = line_post("https://api.line.me/v2/bot/richmenu", token, body: body, content_type: "application/json")
    rich_menu_id = result.fetch("richMenuId")
    puts "✓ Created: #{rich_menu_id}"

    puts "Uploading image..."
    png = richmenu_png(2500, 843)
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

# ── PNG generation ───────────────────────────────────────────────────────────

CELL_COLORS = [
  "\x7D\xAD\xC4".b,  # おしっこ: 水色
  "\xA6\x7B\x50".b,  # うんち:   こげ茶
  "\x7B\xAD\x7B".b,  # ごはん:   緑
  "\x5B\x8E\x9F".b,  # 散歩:     青
  "\x8A\x7B\xAF".b,  # 状態確認: 紫
  "\xC9\x8A\x7A".b,  # タイムライン: コーラル
].freeze

def richmenu_png(width, height)
  require "zlib"

  white    = "\xFF\xFF\xFF".b
  bw       = 8          # border / separator width (px)
  col_sep1 = 833
  col_sep2 = 1666
  row_sep  = 421

  # 行ピクセル列を事前構築（高速化）
  border_pixels = white * width
  top_pixels    = build_row_pixels(width, col_sep1, col_sep2, bw, white, CELL_COLORS[0], CELL_COLORS[1], CELL_COLORS[2])
  bottom_pixels = build_row_pixels(width, col_sep1, col_sep2, bw, white, CELL_COLORS[3], CELL_COLORS[4], CELL_COLORS[5])

  raw = "".b
  height.times do |y|
    raw << "\x00".b   # filter byte (None)
    if y < bw || y >= height - bw || (y >= row_sep - bw && y < row_sep + bw)
      raw << border_pixels
    elsif y < row_sep
      raw << top_pixels
    else
      raw << bottom_pixels
    end
  end

  compressed = Zlib::Deflate.deflate(raw)

  ihdr = png_chunk("IHDR", [width, height, 8, 2, 0, 0, 0].pack("NNCCCCC"))
  idat = png_chunk("IDAT", compressed)
  iend = png_chunk("IEND", "".b)

  ("\x89PNG\r\n\x1a\n".b + ihdr + idat + iend).b
end

def build_row_pixels(width, col_sep1, col_sep2, bw, white, c1, c2, c3)
  [
    white * bw,
    c1    * (col_sep1 - 2 * bw),
    white * (2 * bw),
    c2    * (col_sep2 - col_sep1 - 2 * bw),
    white * (2 * bw),
    c3    * (width - col_sep2 - 2 * bw),
    white * bw
  ].join.b
end

def png_chunk(type, data)
  type_b = type.encode("ASCII").b
  data_b = data.b
  crc    = Zlib.crc32(type_b + data_b)
  ([data_b.bytesize].pack("N") + type_b + data_b + [crc].pack("N")).b
end
