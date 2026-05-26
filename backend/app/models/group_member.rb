class GroupMember < ApplicationRecord
  belongs_to :group
  belongs_to :user

  enum role: { owner: "owner", member: "member" }

  validates :role, presence: true
  validates :joined_at, presence: true
  validates :user_id, uniqueness: { scope: :group_id }

  before_validation :set_joined_at, on: :create

  private

  def set_joined_at
    self.joined_at ||= Time.current
  end
end
