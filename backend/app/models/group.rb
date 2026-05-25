class Group < ApplicationRecord
  has_many :group_members, dependent: :destroy
  has_many :users, through: :group_members
  has_many :dogs, dependent: :destroy

  validates :name, presence: true
  validates :invite_token, presence: true, uniqueness: true

  before_validation :generate_invite_token, on: :create

  private

  def generate_invite_token
    self.invite_token ||= SecureRandom.urlsafe_base64(16)
  end
end
