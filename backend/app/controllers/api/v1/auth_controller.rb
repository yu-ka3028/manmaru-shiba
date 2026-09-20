module Api
  module V1
    class AuthController < ApplicationController
      def line
        access_token = params[:access_token]

        profile = fetch_line_profile(access_token)
        unless profile
          render json: { error: "Invalid LINE token" }, status: :unauthorized and return
        end

        user = User.find_by(line_user_id: profile["userId"])
        unless user
          render json: { error: "User not found. Please open the LINE bot first." }, status: :not_found and return
        end

        render_auth_response(user)
      end

      def development
        return head :not_found unless Rails.env.development?
        return head :forbidden unless request.local?

        user = User.find_or_create_by!(line_user_id: "development-local-user") do |new_user|
          new_user.display_name = "ローカル確認ユーザー"
        end

        render_auth_response(user)
      end

      private

      def render_auth_response(user)
        token = JWT.encode(
          { user_id: user.id, exp: 24.hours.from_now.to_i },
          ENV.fetch("JWT_SECRET"),
          "HS256"
        )

        render json: {
          token: token,
          dogs: user.dogs.includes(:group).map { |d| { id: d.id, name: d.name, invite_token: d.group&.invite_token } }
        }
      end

      def fetch_line_profile(access_token)
        uri = URI("https://api.line.me/v2/profile")
        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = true

        request = Net::HTTP::Get.new(uri)
        request["Authorization"] = "Bearer #{access_token}"

        response = http.request(request)
        return nil unless response.is_a?(Net::HTTPOK)

        JSON.parse(response.body)
      end
    end
  end
end
