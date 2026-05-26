class CreateDogs < ActiveRecord::Migration[7.0]
  def change
    create_table :dogs do |t|
      t.references :group, null: false, foreign_key: true
      t.string :name
      t.date :birth_date

      t.timestamps
    end
  end
end
