require "test_helper"

class Api::V1::GroupsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = create_user
  end

  test "creates a group for an authenticated user" do
    assert_difference(["Group.count", "GroupMember.count"]) do
      post "/api/v1/groups", params: { name: "新しいグループ" }.to_json, headers: json_headers(@user)
    end

    assert_response :created
    assert_equal "新しいグループ", response_json["name"]
  end

  test "requires authentication to create or join" do
    post "/api/v1/groups", params: { name: "グループ" }.to_json, headers: json_headers
    assert_response :unauthorized

    post "/api/v1/groups/join", params: { invite_token: "missing" }.to_json, headers: json_headers
    assert_response :unauthorized
  end

  test "previews a valid invite token without authentication" do
    group = create_group(name: "招待グループ")
    dog = create_dog(group, name: "招待犬")

    get "/api/v1/groups/preview?invite_token=#{group.invite_token}"

    assert_response :success
    assert_equal group.name, response_json["group_name"]
    assert_equal dog.name, response_json["dog_name"]
  end
end
