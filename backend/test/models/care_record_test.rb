require "test_helper"

class CareRecordTest < ActiveSupport::TestCase
  setup do
    @user = create_user
    group = create_group(user: @user)
    @dog = create_dog(group)
  end

  test "accepts supported care types" do
    record = CareRecord.new(dog: @dog, user: @user, care_type: "meal", recorded_at: Time.current)

    assert_predicate record, :valid?
  end

  test "rejects unsupported care types" do
    record = CareRecord.new(dog: @dog, user: @user, care_type: "invalid", recorded_at: Time.current)

    assert_not record.valid?
    assert record.errors[:care_type].any?
  end
end
