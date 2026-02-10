/* ============================================================
   Icons — Thin wrappers for backward compatibility
   Uses FontAwesome classes — components just render <i> tags
   ============================================================ */
import React from 'react';

// Helper: create a simple icon component from a FontAwesome class
const fa = (cls) => ({ size = 16, className = '' }) => (
  <i className={`${cls} ${className}`} style={{ fontSize: size }} />
);

// Named exports for any legacy imports still used in code
export const MapIcon = fa('fa-solid fa-map-location-dot');
export const EmailIcon = fa('fa-regular fa-envelope');
export const LockIcon = fa('fa-solid fa-lock');
export const UserIcon = fa('fa-regular fa-user');

// Namespace for old Sidebar/Layout references: Icons.Dashboard etc.
export const Icons = {
  Dashboard: fa('fa-solid fa-chart-pie'),
  MapPin: fa('fa-solid fa-map-pin'),
  List: fa('fa-solid fa-list'),
  Map: fa('fa-solid fa-map'),
  Plus: fa('fa-solid fa-plus'),
  Cloud: fa('fa-solid fa-cloud'),
  Sync: fa('fa-solid fa-arrows-rotate'),
  Clock: fa('fa-regular fa-clock'),
  BarChart: fa('fa-solid fa-chart-bar'),
  Settings: fa('fa-solid fa-gear'),
  Road: fa('fa-solid fa-road'),
  ChevronRight: fa('fa-solid fa-chevron-right'),
  ChevronLeft: fa('fa-solid fa-chevron-left'),
  ChevronDown: fa('fa-solid fa-chevron-down'),
  LogOut: fa('fa-solid fa-right-from-bracket'),
  Menu: fa('fa-solid fa-bars'),
  Search: fa('fa-solid fa-magnifying-glass'),
  Bell: fa('fa-regular fa-bell'),
  Check: fa('fa-solid fa-check'),
  X: fa('fa-solid fa-xmark'),
  Edit: fa('fa-solid fa-pen'),
  Trash: fa('fa-solid fa-trash'),
  Eye: fa('fa-solid fa-eye'),
  Camera: fa('fa-solid fa-camera'),
  Download: fa('fa-solid fa-download'),
  Upload: fa('fa-solid fa-upload'),
  Filter: fa('fa-solid fa-filter'),
  ArrowUp: fa('fa-solid fa-arrow-up'),
  ArrowDown: fa('fa-solid fa-arrow-down'),
};

// StatsPage icon exports
export const BarChartIcon = fa('fa-solid fa-chart-bar');
export const PieChartIcon = fa('fa-solid fa-chart-pie');
export const TrendingUpIcon = fa('fa-solid fa-arrow-trend-up');
export const CalendarIcon = fa('fa-regular fa-calendar');
export const ClockIcon = fa('fa-regular fa-clock');
export const CheckCircleIcon = fa('fa-solid fa-circle-check');
export const AlertCircleIcon = fa('fa-solid fa-circle-exclamation');
export const XCircleIcon = fa('fa-solid fa-circle-xmark');

export default Icons;
