class CreateGroomingRecords < ActiveRecord::Migration[7.0]
  def change
    create_table :grooming_records do |t|
      t.references :dog, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :grooming_type, null: false
      t.datetime :performed_at, null: false

      t.timestamps
    end

    add_index :grooming_records, [:dog_id, :performed_at, :id], order: { performed_at: :desc, id: :desc }, name: "index_grooming_records_on_dog_and_performed_at_and_id"
  end
end
