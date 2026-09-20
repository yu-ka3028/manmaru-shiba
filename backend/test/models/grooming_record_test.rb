require "test_helper"

class GroomingRecordTest < ActiveSupport::TestCase
  test "accepts supported grooming types" do
    record = GroomingRecord.new(grooming_type: "nail_trim", performed_at: 1.hour.ago)

    record.valid?

    assert_not record.errors[:grooming_type].any?
  end

  test "rejects performed dates in the future" do
    record = GroomingRecord.new(grooming_type: "shampoo", performed_at: 1.minute.from_now)

    assert_not record.valid?
    assert_includes record.errors[:performed_at], "は現在時刻以前にしてください"
  end
end
