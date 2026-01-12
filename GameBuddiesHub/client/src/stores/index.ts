import { configureStore } from '@reduxjs/toolkit'
import userReducer from './UserStore'

const store = configureStore({
  reducer: {
    user: userReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store
