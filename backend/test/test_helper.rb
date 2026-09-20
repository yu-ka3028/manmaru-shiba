ENV["RAILS_ENV"] ||= "test"
ENV["JWT_SECRET"] ||= "minitest-only-secret"
require_relative "../config/environment"
require "rails/test_help"
require "jwt"
require "json"

module TestDataHelpers
  def create_user(name = "テストユーザー")
    User.create!(line_user_id: "line-#{SecureRandom.hex(8)}", display_name: name)
  end

  def create_group(user: nil, name: "テストグループ")
    group = Group.create!(name: name)
    GroupMember.create!(group: group, user: user || create_user, role: :owner) if user
    group
  end

  def add_member(group, user, role: :member)
    GroupMember.create!(group: group, user: user, role: role)
  end

  def create_dog(group, name: "テスト犬")
    Dog.create!(group: group, name: name, birth_date: Date.new(2020, 1, 1))
  end

  def auth_token(user)
    JWT.encode({ user_id: user.id }, ENV.fetch("JWT_SECRET"), "HS256")
  end

  def expired_auth_token(user)
    JWT.encode({ user_id: user.id, exp: 1.hour.ago.to_i }, ENV.fetch("JWT_SECRET"), "HS256")
  end

  def json_headers(user = nil)
    headers = { "CONTENT_TYPE" => "application/json" }
    headers["Authorization"] = "Bearer #{auth_token(user)}" if user
    headers
  end

  def response_json
    JSON.parse(response.body)
  end
end

class ActiveSupport::TestCase
  parallelize(workers: :number_of_processors)
  include TestDataHelpers
end

class ActionDispatch::IntegrationTest
  include TestDataHelpers
end
