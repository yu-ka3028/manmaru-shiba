class User < ApplicationRecord
  has_many :group_members, dependent: :destroy
  has_many :groups, through: :group_members
  has_many :care_records, dependent: :destroy

  validates :line_user_id, presence: true, uniqueness: true
  validates :display_name, presence: true

  def dogs
    Dog.joins(group: :group_members).where(group_members: { user_id: id })
  end
end
