/**
 * Pictogram Icons for Low-Literacy Medical Interface
 * Following ISO 7010 medical safety symbols standards where applicable
 * 
 * These icons are designed to be universally understood without text
 * and use standard medical pictogram conventions
 */

import { forwardRef, type SVGProps } from "react";

// Medical Cross/Plus Symbol - Universal for medical/healthcare
export const MedicalCross = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect x="35" y="10" width="30" height="80" fill="#E53935" />
      <rect x="10" y="35" width="80" height="30" fill="#E53935" />
    </svg>
  ),
);
MedicalCross.displayName = "MedicalCross";

// Heart Symbol - Vital signs, cardiac health
export const Heart = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M50 85C50 85 10 55 10 30C10 15 22 5 35 5C42 5 48 10 50 15C52 10 58 5 65 5C78 5 90 15 90 30C90 55 50 85 50 85Z"
        fill="#E53935"
      />
    </svg>
  ),
);
Heart.displayName = "Heart";

// Thermometer - Temperature/fever
export const Thermometer = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect x="42" y="10" width="16" height="70" rx="8" fill="#FF6F00" />
      <circle cx="50" cy="75" r="15" fill="#FF6F00" />
      <rect x="45" y="20" width="10" height="40" fill="#FFF" />
    </svg>
  ),
);
Thermometer.displayName = "Thermometer";

// Person/Patient Symbol
export const Person = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="50" cy="25" r="18" fill="#1976D2" />
      <path
        d="M20 90C20 60 30 50 50 50C70 50 80 60 80 90"
        fill="#1976D2"
      />
    </svg>
  ),
);
Person.displayName = "Person";

// Stethoscope - Medical examination
export const Stethoscope = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="25" cy="35" r="18" stroke="#1976D2" strokeWidth="6" />
      <path
        d="M25 53C25 53 15 53 15 75C15 90 30 90 30 90"
        stroke="#1976D2"
        strokeWidth="6"
        fill="none"
      />
      <path
        d="M30 90C30 90 45 90 45 70C45 55 55 55 55 55"
        stroke="#1976D2"
        strokeWidth="6"
        fill="none"
      />
      <circle cx="75" cy="35" r="12" fill="#1976D2" />
      <circle cx="85" cy="35" r="8" fill="#1976D2" />
    </svg>
  ),
);
Stethoscope.displayName = "Stethoscope";

// Bandage/Wound Care
export const Bandage = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect x="20" y="20" width="60" height="60" rx="8" fill="#F5F5F5" stroke="#4CAF50" strokeWidth="4" />
      <line x1="20" y1="35" x2="80" y2="35" stroke="#4CAF50" strokeWidth="2" />
      <line x1="20" y1="50" x2="80" y2="50" stroke="#4CAF50" strokeWidth="2" />
      <line x1="20" y1="65" x2="80" y2="65" stroke="#4CAF50" strokeWidth="2" />
    </svg>
  ),
);
Bandage.displayName = "Bandage";

// Camera/Image Capture - For triage photos
export const CameraLarge = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect x="10" y="20" width="80" height="60" rx="8" fill="#424242" />
      <circle cx="50" cy="50" r="20" fill="#FFF" />
      <circle cx="50" cy="50" r="12" fill="#424242" />
      <rect x="35" y="10" width="30" height="15" fill="#424242" />
    </svg>
  ),
);
CameraLarge.displayName = "CameraLarge";

// Referral/Hospital Symbol - For referral actions
export const Hospital = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect x="20" y="25" width="60" height="60" fill="#FFF" stroke="#E53935" strokeWidth="4" />
      <rect x="20" y="15" width="60" height="15" fill="#E53935" />
      <rect x="42" y="35" width="16" height="40" fill="#E53935" />
      <rect x="30" y="47" width="40" height="16" fill="#E53935" />
    </svg>
  ),
);
Hospital.displayName = "Hospital";

// Urgency Indicators - Traffic Light System
export const UrgencyLow = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="50" cy="50" r="40" fill="#4CAF50" />
      <path d="M50 25L50 75M25 50L75 50" stroke="#FFF" strokeWidth="8" strokeLinecap="round" />
    </svg>
  ),
);
UrgencyLow.displayName = "UrgencyLow";

export const UrgencyMedium = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="50" cy="50" r="40" fill="#FF9800" />
      <path d="M50 30L50 70" stroke="#FFF" strokeWidth="8" strokeLinecap="round" />
      <circle cx="50" cy="55" r="5" fill="#FFF" />
    </svg>
  ),
);
UrgencyMedium.displayName = "UrgencyMedium";

export const UrgencyHigh = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="50" cy="50" r="40" fill="#F44336" />
      <path d="M50 25L50 75M25 50L75 50" stroke="#FFF" strokeWidth="8" strokeLinecap="round" />
    </svg>
  ),
);
UrgencyHigh.displayName = "UrgencyHigh";

// Body Diagrams for Vital Signs

// Arm measurement location
export const ArmMeasurement = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M70 20C70 20 80 30 80 50C80 70 70 80 70 80"
        stroke="#1976D2"
        strokeWidth="12"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="80" cy="50" r="8" fill="#E53935" />
    </svg>
  ),
);
ArmMeasurement.displayName = "ArmMeasurement";

// Forehead temperature location
export const ForeheadMeasurement = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="50" cy="35" r="25" stroke="#1976D2" strokeWidth="6" fill="none" />
      <path d="M50 60L50 85" stroke="#1976D2" strokeWidth="8" strokeLinecap="round" />
      <circle cx="50" cy="25" r="8" fill="#E53935" />
    </svg>
  ),
);
ForeheadMeasurement.displayName = "ForeheadMeasurement";

// Chest/Breathing location
export const ChestMeasurement = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="50" cy="30" r="18" stroke="#1976D2" strokeWidth="6" fill="none" />
      <path
        d="M25 48C25 48 20 55 20 70C20 85 35 90 50 90C65 90 80 85 80 70C80 55 75 48 75 48"
        stroke="#1976D2"
        strokeWidth="6"
        fill="none"
      />
      <circle cx="50" cy="50" r="10" fill="#E53935" />
    </svg>
  ),
);
ChestMeasurement.displayName = "ChestMeasurement";

// Condition Icons

// Fever
export const FeverIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="50" cy="35" r="25" stroke="#FF6F00" strokeWidth="6" fill="none" />
      <path d="M50 60L50 85" stroke="#FF6F00" strokeWidth="8" strokeLinecap="round" />
      <path d="M30 20L70 20M35 15L65 15" stroke="#FF6F00" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
);
FeverIcon.displayName = "FeverIcon";

// Wound/Injury
export const WoundIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M20 40C20 40 30 35 40 45C50 55 60 35 80 40"
        stroke="#E53935"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M25 50C25 50 35 45 45 55C55 65 65 45 85 50"
        stroke="#E53935"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  ),
);
WoundIcon.displayName = "WoundIcon";

// Breathing/Respiratory
export const BreathingIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M20 50C20 30 35 15 50 15C65 15 80 30 80 50"
        stroke="#2196F3"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M20 50C20 70 35 85 50 85C65 85 80 70 80 50"
        stroke="#2196F3"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="50" cy="50" r="8" fill="#2196F3" />
    </svg>
  ),
);
BreathingIcon.displayName = "BreathingIcon";

// Malnutrition
export const MalnutritionIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="50" cy="25" r="15" stroke="#FF9800" strokeWidth="5" fill="none" />
      <path
        d="M25 90C25 60 35 45 50 45C65 45 75 60 75 90"
        stroke="#FF9800"
        strokeWidth="5"
        fill="none"
      />
      <path d="M40 35L60 35" stroke="#FF9800" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
);
MalnutritionIcon.displayName = "MalnutritionIcon";

// Dashboard/Home
export const HomeIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M10 45L50 15L90 45V90H10V45Z"
        stroke="#1976D2"
        strokeWidth="6"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  ),
);
HomeIcon.displayName = "HomeIcon";

// Notifications
export const NotificationIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M50 15C35 15 25 25 25 40V55C25 60 20 65 15 65V70H85V65C80 65 75 60 75 55V40C75 25 65 15 50 15Z"
        fill="#FFC107"
      />
      <circle cx="50" cy="85" r="10" fill="#FFC107" />
    </svg>
  ),
);
NotificationIcon.displayName = "NotificationIcon";