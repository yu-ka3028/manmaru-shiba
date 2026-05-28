module Api
  module V1
    class DogsController < ApplicationController
      include Authenticatable

      def create
        group = @current_user.groups.find_by(id: params[:group_id])
        unless group
          render json: { error: "Group not found" }, status: :not_found and return
        end

        dog = group.dogs.new(name: params[:name], birth_date: params[:birth_date])
        if dog.save
          AlertSetting::CARE_TYPES.each do |type|
            dog.alert_settings.create!(care_type: type, interval_hours: 4)
          end
          render json: { id: dog.id, name: dog.name }, status: :created
        else
          render json: { errors: dog.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def show
        dog = @current_user.dogs.find_by(id: params[:id])
        unless dog
          render json: { error: "Not found" }, status: :not_found and return
        end
        render json: { id: dog.id, name: dog.name, birth_date: dog.birth_date }
      end
    end
  end
end
