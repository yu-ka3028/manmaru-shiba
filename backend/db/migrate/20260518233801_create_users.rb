class CreateUsers < ActiveRecord::Migration[7.0]
  def change
    create_table :users do |t|
      t.string :line_user_id, null: false
      t.string :display_name, null: false
      t.string :picture_url

      t.timestamps
    end

    add_index :users, :line_user_id, unique: true
  end
end
