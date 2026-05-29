Rails.application.routes.draw do
  post "/webhooks/line", to: "webhooks/line#receive"

  namespace :api do
    namespace :v1 do
      post "/auth/line", to: "auth#line"

      resources :groups, only: [:create] do
        collection do
          post :join
        end
      end

      resources :care_records, only: [:update, :destroy]

      resources :dogs, only: [:create, :show] do
        resources :care_records, only: [:index, :create]
        resource :alert_settings, only: [:show, :update]
      end
    end
  end
end
