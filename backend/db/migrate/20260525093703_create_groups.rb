class CreateGroups < ActiveRecord::Migration[7.0]
  def change
    create_table :groups do |t|
      t.string :name, null: false
      t.string :invite_token, null: false

      t.timestamps
    end
    add_index :groups, :invite_token, unique: true
  end
end
