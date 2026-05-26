class Dog < ApplicationRecord
  belongs_to :group
  has_many :care_records, dependent: :destroy
  has_many :alert_settings, dependent: :destroy

  validates :name, presence: true
end
