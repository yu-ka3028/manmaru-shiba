module Api
  module V1
    class GroomingRecordsController < ApplicationController
      include Authenticatable

      MAX_LIMIT = 50

      def index
        dog = @current_user.dogs.find_by(id: params[:dog_id])
        unless dog
          render json: { error: "Not found" }, status: :not_found and return
        end

        records = dog.grooming_records.includes(:user).order(performed_at: :desc, id: :desc)
        records = apply_cursor(records) if params[:cursor].present?
        limit = [[params.fetch(:limit, MAX_LIMIT).to_i, 1].max, MAX_LIMIT].min
        records = records.limit(limit + 1).to_a
        has_next = records.length > limit
        records = records.first(limit)

        render json: {
          records: records.map { |record| serialize(record) },
          next_cursor: has_next ? encode_cursor(records.last) : nil
        }
      rescue ArgumentError
        render json: { error: "Invalid cursor" }, status: :bad_request
      end

      def create
        dog = @current_user.dogs.find_by(id: params[:dog_id])
        unless dog
          render json: { error: "Not found" }, status: :not_found and return
        end

        record = dog.grooming_records.new(grooming_record_params.merge(user: @current_user))
        if record.save
          render json: serialize(record), status: :created
        else
          render json: { errors: record.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def grooming_record_params
        params.require(:grooming_record).permit(:grooming_type, :performed_at)
      end

      def apply_cursor(records)
        cursor = decode_cursor(params[:cursor])
        raise ArgumentError unless cursor.is_a?(Hash) && cursor.key?("performed_at") && cursor.key?("id")

        performed_at = Time.iso8601(cursor.fetch("performed_at"))
        id = Integer(cursor.fetch("id"))
        records.where("performed_at < :performed_at OR (performed_at = :performed_at AND id < :id)", performed_at: performed_at, id: id)
      end

      def encode_cursor(record)
        Base64.urlsafe_encode64({ performed_at: record.performed_at.iso8601(6), id: record.id }.to_json, padding: false)
      end

      def decode_cursor(value)
        JSON.parse(Base64.urlsafe_decode64(value + ("=" * ((4 - value.length % 4) % 4))))
      rescue JSON::ParserError, ArgumentError, KeyError
        raise ArgumentError
      end

      def serialize(record)
        {
          id: record.id,
          grooming_type: record.grooming_type,
          performed_at: record.performed_at.iso8601,
          user_name: record.user.display_name
        }
      end
    end
  end
end
