require "test_helper"

class Api::V1::DogsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = create_user
    @group = create_group(user: @user)
    @other_user = create_user("別ユーザー")
    @other_group = create_group(user: @other_user, name: "別グループ")
  end

  test "creates a dog in a group belonging to the user" do
    assert_difference("Dog.count") do
      post "/api/v1/dogs",
           params: { group_id: @group.id, name: "新しい犬", birth_date: "2021-02-03" }.to_json,
           headers: json_headers(@user)
    end

    assert_response :created
    assert_equal "新しい犬", response_json["name"]
  end

  test "rejects unauthenticated and non-member dog access" do
    post "/api/v1/dogs", params: { group_id: @group.id, name: "犬" }.to_json, headers: json_headers
    assert_response :unauthorized

    get "/api/v1/dogs/#{create_dog(@other_group).id}", headers: json_headers(@user)
    assert_response :not_found
  end
end
