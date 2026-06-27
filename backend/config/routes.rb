Rails.application.routes.draw do
  get "/health", to: proc {
    memory_kb = File.read("/proc/self/status").match(/VmRSS:\s+(\d+)/)[1].to_i
    [200, {"Content-Type" => "application/json"}, [{ status: "ok", memory_mb: (memory_kb / 1024.0).round(1) }.to_json]]
  }

  post "/webhooks/line", to: "webhooks/line#receive"

  namespace :api do
    namespace :v1 do
      post "/auth/line", to: "auth#line"

      resources :groups, only: [:create] do
        collection do
          post :join
          get :preview
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
