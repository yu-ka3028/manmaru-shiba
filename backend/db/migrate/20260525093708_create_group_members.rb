class CreateGroupMembers < ActiveRecord::Migration[7.0]
  def change
    create_table :group_members do |t|
      t.references :group, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :role, null: false
      t.datetime :joined_at, null: false

      t.timestamps
    end
    add_index :group_members, [:group_id, :user_id], unique: true
  end
end
