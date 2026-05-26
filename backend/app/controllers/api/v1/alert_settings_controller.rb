module Api
  module V1
    class AlertSettingsController < ApplicationController
      include Authenticatable
      before_action :set_dog

      def show
        settings = @dog.alert_settings.where(care_type: AlertSetting::CARE_TYPES)
        render json: settings.map { |s| { care_type: s.care_type, interval_hours: s.interval_hours } }
      end

      def update
        care_type = params[:care_type]
        interval_hours = params[:interval_hours].to_i

        unless AlertSetting::CARE_TYPES.include?(care_type)
          render json: { error: "Invalid care_type" }, status: :unprocessable_entity and return
        end

        setting = @dog.alert_settings.find_or_initialize_by(care_type: care_type)
        setting.interval_hours = interval_hours

        if setting.save
          render json: { care_type: setting.care_type, interval_hours: setting.interval_hours }
        else
          render json: { errors: setting.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def set_dog
        @dog = @current_user.dogs.find_by(id: params[:dog_id])
        render json: { error: "Not found" }, status: :not_found unless @dog
      end
    end
  end
end
