class CreateCareRecords < ActiveRecord::Migration[7.0]
  def change
    create_table :care_records do |t|
      t.references :dog, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :care_type, null: false
      t.datetime :recorded_at, null: false
      t.text :content
      t.string :photo_url

      t.timestamps
    end
  end
end
