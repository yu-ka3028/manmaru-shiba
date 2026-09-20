class GroomingRecord < ApplicationRecord
  belongs_to :dog
  belongs_to :user

  GROOMING_TYPES = %w[nail_trim shampoo brushing other].freeze

  validates :grooming_type, presence: true, inclusion: { in: GROOMING_TYPES }
  validates :performed_at, presence: true
  validate :performed_at_cannot_be_in_the_future

  private

  def performed_at_cannot_be_in_the_future
    return if performed_at.blank? || performed_at <= Time.current

    errors.add(:performed_at, "は現在時刻以前にしてください")
  end
end
