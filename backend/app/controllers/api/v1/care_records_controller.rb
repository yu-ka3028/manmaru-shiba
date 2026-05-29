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
          .where(recorded_at: Time.current.beginning_of_day..)
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
    end
  end
end
