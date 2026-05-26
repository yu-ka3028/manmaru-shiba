class CareRecord < ApplicationRecord
  belongs_to :dog
  belongs_to :user

  CARE_TYPES = %w[meal walk_short walk_long pee poop].freeze

  validates :care_type, presence: true, inclusion: { in: CARE_TYPES }
  validates :recorded_at, presence: true
end
