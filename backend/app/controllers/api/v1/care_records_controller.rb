module Api
  module V1
    class CareRecordsController < ApplicationController
      include Authenticatable

      def index
        dog = @current_user.dogs.find_by(id: params[:dog_id])
        unless dog
          render json: { error: "Not found" }, status: :not_found and return
        end

        records = dog.care_records
          .includes(:user)
          .where(recorded_at: 24.hours.ago..)
          .order(recorded_at: :desc)

        render json: records.map { |r|
          {
            id: r.id,
            care_type: r.care_type,
            recorded_at: r.recorded_at.iso8601,
            user_name: r.user.display_name
          }
        }
      end

      def update
        record = @current_user.care_records.find_by(id: params[:id])
        unless record
          render json: { error: "Not found" }, status: :not_found and return
        end

        if record.update(care_record_params)
          render json: {
            id: record.id,
            care_type: record.care_type,
            recorded_at: record.recorded_at.iso8601,
            user_name: @current_user.display_name
          }
        else
          render json: { errors: record.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        record = @current_user.care_records.find_by(id: params[:id])
        unless record
          render json: { error: "Not found" }, status: :not_found and return
        end

        record.destroy
        head :no_content
      end

      private

      def care_record_params
        params.require(:care_record).permit(:care_type, :recorded_at)
      end
    end
  end
end
