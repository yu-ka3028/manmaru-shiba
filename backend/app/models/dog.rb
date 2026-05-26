class Dog < ApplicationRecord
  belongs_to :group
  has_many :care_records, dependent: :destroy
  has_many :alert_settings, dependent: :destroy

  validates :name, presence: true

  def latest_care_status
    {
      pee:  care_records.where(care_type: "pee").order(recorded_at: :desc).first,
      poop: care_records.where(care_type: "poop").order(recorded_at: :desc).first,
      meal: care_records.where(care_type: "meal").order(recorded_at: :desc).first,
      walk_today_count: care_records
        .where(care_type: %w[walk_short walk_long])
        .where(recorded_at: Time.current.beginning_of_day..)
        .count
    }
  end
end
