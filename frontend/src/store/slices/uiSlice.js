import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    mobileMenuOpen: false,
    // Modal state
    modals: {
      upgradeModal: false,
      confirmModal: false,
    },
    // Toast/notification queue
    notifications: [],
    // Global loading overlay
    globalLoading: false,
  },
  reducers: {
    toggleMobileMenu(state) {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },
    setMobileMenu(state, action) {
      state.mobileMenuOpen = action.payload;
    },
    openModal(state, action) {
      const modalName = action.payload;
      if (Object.prototype.hasOwnProperty.call(state.modals, modalName)) {
        state.modals[modalName] = true;
      }
    },
    closeModal(state, action) {
      const modalName = action.payload;
      if (Object.prototype.hasOwnProperty.call(state.modals, modalName)) {
        state.modals[modalName] = false;
      }
    },
    addNotification(state, action) {
      const notification = {
        id: Date.now().toString(),
        type: 'info', // info | success | warning | error
        message: '',
        duration: 4000,
        ...action.payload,
      };
      state.notifications.push(notification);
    },
    removeNotification(state, action) {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
    clearNotifications(state) {
      state.notifications = [];
    },
    setGlobalLoading(state, action) {
      state.globalLoading = action.payload;
    },
  },
});

export const {
  toggleMobileMenu,
  setMobileMenu,
  openModal,
  closeModal,
  addNotification,
  removeNotification,
  clearNotifications,
  setGlobalLoading,
} = uiSlice.actions;

export default uiSlice.reducer;
