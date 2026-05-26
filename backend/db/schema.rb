# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.0].define(version: 2026_05_25_093715) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "alert_settings", force: :cascade do |t|
    t.bigint "dog_id", null: false
    t.string "care_type", null: false
    t.integer "interval_hours", default: 4, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["dog_id", "care_type"], name: "index_alert_settings_on_dog_id_and_care_type", unique: true
    t.index ["dog_id"], name: "index_alert_settings_on_dog_id"
  end

  create_table "care_records", force: :cascade do |t|
    t.bigint "dog_id", null: false
    t.bigint "user_id", null: false
    t.string "care_type", null: false
    t.datetime "recorded_at", null: false
    t.text "content"
    t.string "photo_url"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["dog_id"], name: "index_care_records_on_dog_id"
    t.index ["user_id"], name: "index_care_records_on_user_id"
  end

  create_table "dogs", force: :cascade do |t|
    t.bigint "group_id", null: false
    t.string "name"
    t.date "birth_date"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["group_id"], name: "index_dogs_on_group_id"
  end

  create_table "group_members", force: :cascade do |t|
    t.bigint "group_id", null: false
    t.bigint "user_id", null: false
    t.string "role", null: false
    t.datetime "joined_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["group_id", "user_id"], name: "index_group_members_on_group_id_and_user_id", unique: true
    t.index ["group_id"], name: "index_group_members_on_group_id"
    t.index ["user_id"], name: "index_group_members_on_user_id"
  end

  create_table "groups", force: :cascade do |t|
    t.string "name", null: false
    t.string "invite_token", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["invite_token"], name: "index_groups_on_invite_token", unique: true
  end

  create_table "users", force: :cascade do |t|
    t.string "line_user_id", null: false
    t.string "display_name", null: false
    t.string "picture_url"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["line_user_id"], name: "index_users_on_line_user_id", unique: true
  end

  add_foreign_key "alert_settings", "dogs"
  add_foreign_key "care_records", "dogs"
  add_foreign_key "care_records", "users"
  add_foreign_key "dogs", "groups"
  add_foreign_key "group_members", "groups"
  add_foreign_key "group_members", "users"
end
