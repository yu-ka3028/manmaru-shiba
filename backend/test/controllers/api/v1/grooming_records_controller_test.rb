require "test_helper"

class Api::V1::GroomingRecordsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = create_user
    @group = create_group(user: @user)
    @dog = create_dog(@group)
    @other_user = create_user("別ユーザー")
    @other_group = create_group(user: @other_user, name: "別グループ")
    @other_dog = create_dog(@other_group, name: "別の犬")
  end

  test "creates a grooming record" do
    assert_difference("GroomingRecord.count") do
      post "/api/v1/dogs/#{@dog.id}/grooming_records",
           params: { grooming_record: { grooming_type: "shampoo", performed_at: 1.hour.ago.iso8601 } }.to_json,
           headers: json_headers(@user)
    end

    assert_response :created
    assert_equal "shampoo", response_json["grooming_type"]
  end

  test "lists all records in descending performed time and id order" do
    timestamp = 2.hours.ago
    first = GroomingRecord.create!(dog: @dog, user: @user, grooming_type: "brushing", performed_at: timestamp)
    second = GroomingRecord.create!(dog: @dog, user: @user, grooming_type: "nail_trim", performed_at: timestamp)
    latest = GroomingRecord.create!(dog: @dog, user: @user, grooming_type: "shampoo", performed_at: 1.hour.ago)

    get "/api/v1/dogs/#{@dog.id}/grooming_records", headers: json_headers(@user)

    assert_response :success
    assert_equal [latest.id, second.id, first.id], response_json["records"].map { |r| r["id"] }
  end

  test "rejects future dates" do
    post "/api/v1/dogs/#{@dog.id}/grooming_records",
         params: { grooming_record: { grooming_type: "shampoo", performed_at: 1.hour.from_now.iso8601 } }.to_json,
         headers: json_headers(@user)

    assert_response :unprocessable_entity
  end

  test "rejects invalid grooming types" do
    post "/api/v1/dogs/#{@dog.id}/grooming_records",
         params: { grooming_record: { grooming_type: "unknown", performed_at: 1.hour.ago.iso8601 } }.to_json,
         headers: json_headers(@user)

    assert_response :unprocessable_entity
  end

  test "requires authentication" do
    get "/api/v1/dogs/#{@dog.id}/grooming_records", headers: { "CONTENT_TYPE" => "application/json" }

    assert_response :unauthorized
  end

  test "rejects an invalid JWT" do
    get "/api/v1/dogs/#{@dog.id}/grooming_records",
        headers: { "CONTENT_TYPE" => "application/json", "Authorization" => "Bearer invalid.jwt.token" }

    assert_response :unauthorized
  end

  test "rejects an expired JWT" do
    get "/api/v1/dogs/#{@dog.id}/grooming_records",
        headers: { "CONTENT_TYPE" => "application/json", "Authorization" => "Bearer #{expired_auth_token(@user)}" }

    assert_response :unauthorized
  end

  test "does not expose a dog outside the user's groups" do
    get "/api/v1/dogs/#{@other_dog.id}/grooming_records", headers: json_headers(@user)

    assert_response :not_found
  end

  test "paginates in order with a cursor" do
    records = 3.times.map do |index|
      GroomingRecord.create!(dog: @dog, user: @user, grooming_type: "brushing", performed_at: (index + 1).hours.ago)
    end

    get "/api/v1/dogs/#{@dog.id}/grooming_records?limit=2", headers: json_headers(@user)
    assert_response :success
    first_page = response_json
    assert_equal 2, first_page["records"].length
    assert first_page["next_cursor"].present?
    assert_equal [records[0].id, records[1].id], first_page["records"].map { |record| record["id"] }

    get "/api/v1/dogs/#{@dog.id}/grooming_records?limit=2&cursor=#{first_page["next_cursor"]}", headers: json_headers(@user)
    assert_response :success
    second_page = response_json
    assert_equal 1, second_page["records"].length
    assert_equal [records[2].id], second_page["records"].map { |record| record["id"] }
  end

  test "rejects an invalid cursor" do
    get "/api/v1/dogs/#{@dog.id}/grooming_records?cursor=invalid", headers: json_headers(@user)

    assert_response :bad_request
  end

  test "caps the page size at the maximum" do
    51.times do |index|
      GroomingRecord.create!(dog: @dog, user: @user, grooming_type: "brushing", performed_at: (index + 1).minutes.ago)
    end

    get "/api/v1/dogs/#{@dog.id}/grooming_records?limit=999", headers: json_headers(@user)

    assert_response :success
    assert_equal 50, response_json["records"].length
    assert response_json["next_cursor"].present?
  end
end
