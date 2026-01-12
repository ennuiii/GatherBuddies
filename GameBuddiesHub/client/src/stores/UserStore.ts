import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export const userSlice = createSlice({
  name: 'user',
  initialState: {
    sessionId: '',
    playerName: '',
    loggedIn: false,
  },
  reducers: {
    setSessionId: (state, action: PayloadAction<string>) => {
      state.sessionId = action.payload
    },
    setPlayerName: (state, action: PayloadAction<string>) => {
      state.playerName = action.payload
    },
    setLoggedIn: (state, action: PayloadAction<boolean>) => {
      state.loggedIn = action.payload
    },
  },
})

export const { setSessionId, setPlayerName, setLoggedIn } = userSlice.actions

export default userSlice.reducer
