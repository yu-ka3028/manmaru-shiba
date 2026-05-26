class CreateAlertSettings < ActiveRecord::Migration[7.0]
  def change
    create_table :alert_settings do |t|
      t.references :dog, null: false, foreign_key: true
      t.string :care_type, null: false
      t.integer :interval_hours, null: false, default: 4

      t.timestamps
    end
    add_index :alert_settings, [:dog_id, :care_type], unique: true
  end
end
