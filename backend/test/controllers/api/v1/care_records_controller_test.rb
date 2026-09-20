require "test_helper"

class Api::V1::CareRecordsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = create_user
    @group = create_group(user: @user)
    @dog = create_dog(@group)
    @other_user = create_user("別ユーザー")
    @other_group = create_group(user: @other_user, name: "別グループ")
    @other_dog = create_dog(@other_group, name: "別の犬")
  end

  test "lists only the last 24 hours in descending order" do
    old = CareRecord.create!(dog: @dog, user: @user, care_type: "meal", recorded_at: 25.hours.ago)
    recent = CareRecord.create!(dog: @dog, user: @user, care_type: "pee", recorded_at: 1.hour.ago)

    get "/api/v1/dogs/#{@dog.id}/care_records", headers: json_headers(@user)

    assert_response :success
    assert_equal [recent.id], response_json.map { |record| record["id"] }
  end

  test "requires authentication and group membership" do
    get "/api/v1/dogs/#{@dog.id}/care_records"
    assert_response :unauthorized

    get "/api/v1/dogs/#{@other_dog.id}/care_records", headers: json_headers(@user)
    assert_response :not_found
  end

  test "allows only the owner to update and delete a care record" do
    record = CareRecord.create!(dog: @dog, user: @user, care_type: "meal", recorded_at: 1.hour.ago)

    patch "/api/v1/care_records/#{record.id}",
          params: { care_record: { care_type: "pee" } }.to_json,
          headers: json_headers(@other_user)
    assert_response :not_found

    delete "/api/v1/care_records/#{record.id}", headers: json_headers(@other_user)
    assert_response :not_found
    assert CareRecord.exists?(record.id)

    patch "/api/v1/care_records/#{record.id}",
          params: { care_record: { care_type: "pee" } }.to_json,
          headers: json_headers(@user)
    assert_response :success
    assert_equal "pee", response_json["care_type"]

    delete "/api/v1/care_records/#{record.id}", headers: json_headers(@user)
    assert_response :no_content
    assert_not CareRecord.exists?(record.id)
  end
end
