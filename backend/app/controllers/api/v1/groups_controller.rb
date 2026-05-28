module Api
  module V1
    class GroupsController < ApplicationController
      include Authenticatable

      def create
        group = Group.new(name: params[:name])
        if group.save
          group.group_members.create!(user: @current_user, role: :owner)
          render json: { id: group.id, name: group.name, invite_token: group.invite_token }, status: :created
        else
          render json: { errors: group.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def join
        group = Group.find_by(invite_token: params[:invite_token])
        unless group
          render json: { error: "Invalid invite token" }, status: :not_found and return
        end

        if group.group_members.exists?(user: @current_user)
          render json: { error: "Already a member" }, status: :unprocessable_entity and return
        end

        group.group_members.create!(user: @current_user, role: :member)
        render json: { id: group.id, name: group.name }
      end
    end
  end
end
