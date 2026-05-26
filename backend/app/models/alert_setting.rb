class AlertSetting < ApplicationRecord
  belongs_to :dog

  CARE_TYPES = %w[pee poop].freeze

  validates :care_type, presence: true, inclusion: { in: CARE_TYPES }
  validates :interval_hours, presence: true, numericality: { greater_than: 0 }
  validates :care_type, uniqueness: { scope: :dog_id }
end
