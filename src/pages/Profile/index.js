// src/pages/SignUp/index.js (Profile Page)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './profile.css';

// List of all countries
const countries = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo (Congo-Brazzaville)",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic (Czechia)",
  "Democratic Republic of the Congo",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini (fmr. \"Swaziland\")",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Holy See",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar (formerly Burma)",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine State",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States of America",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe"
];

// Complete list of country codes
const countryCodes = [
  { name: "Afghanistan", dial_code: "+93", code: "AF" },
  { name: "Albania", dial_code: "+355", code: "AL" },
  { name: "Algeria", dial_code: "+213", code: "DZ" },
  { name: "Andorra", dial_code: "+376", code: "AD" },
  { name: "Angola", dial_code: "+244", code: "AO" },
  { name: "Antigua and Barbuda", dial_code: "+1-268", code: "AG" },
  { name: "Argentina", dial_code: "+54", code: "AR" },
  { name: "Armenia", dial_code: "+374", code: "AM" },
  { name: "Australia", dial_code: "+61", code: "AU" },
  { name: "Austria", dial_code: "+43", code: "AT" },
  { name: "Azerbaijan", dial_code: "+994", code: "AZ" },
  { name: "Bahamas", dial_code: "+1-242", code: "BS" },
  { name: "Bahrain", dial_code: "+973", code: "BH" },
  { name: "Bangladesh", dial_code: "+880", code: "BD" },
  { name: "Barbados", dial_code: "+1-246", code: "BB" },
  { name: "Belarus", dial_code: "+375", code: "BY" },
  { name: "Belgium", dial_code: "+32", code: "BE" },
  { name: "Belize", dial_code: "+501", code: "BZ" },
  { name: "Benin", dial_code: "+229", code: "BJ" },
  { name: "Bhutan", dial_code: "+975", code: "BT" },
  { name: "Bolivia", dial_code: "+591", code: "BO" },
  { name: "Bosnia and Herzegovina", dial_code: "+387", code: "BA" },
  { name: "Botswana", dial_code: "+267", code: "BW" },
  { name: "Brazil", dial_code: "+55", code: "BR" },
  { name: "Brunei", dial_code: "+673", code: "BN" },
  { name: "Bulgaria", dial_code: "+359", code: "BG" },
  { name: "Burkina Faso", dial_code: "+226", code: "BF" },
  { name: "Burundi", dial_code: "+257", code: "BI" },
  { name: "Cabo Verde", dial_code: "+238", code: "CV" },
  { name: "Cambodia", dial_code: "+855", code: "KH" },
  { name: "Cameroon", dial_code: "+237", code: "CM" },
  { name: "Canada", dial_code: "+1", code: "CA" },
  { name: "Central African Republic", dial_code: "+236", code: "CF" },
  { name: "Chad", dial_code: "+235", code: "TD" },
  { name: "Chile", dial_code: "+56", code: "CL" },
  { name: "China", dial_code: "+86", code: "CN" },
  { name: "Colombia", dial_code: "+57", code: "CO" },
  { name: "Comoros", dial_code: "+269", code: "KM" },
  { name: "Congo (Congo-Brazzaville)", dial_code: "+242", code: "CG" },
  { name: "Costa Rica", dial_code: "+506", code: "CR" },
  { name: "Croatia", dial_code: "+385", code: "HR" },
  { name: "Cuba", dial_code: "+53", code: "CU" },
  { name: "Cyprus", dial_code: "+357", code: "CY" },
  { name: "Czech Republic (Czechia)", dial_code: "+420", code: "CZ" },
  { name: "Democratic Republic of the Congo", dial_code: "+243", code: "CD" },
  { name: "Denmark", dial_code: "+45", code: "DK" },
  { name: "Djibouti", dial_code: "+253", code: "DJ" },
  { name: "Dominica", dial_code: "+1-767", code: "DM" },
  { name: "Dominican Republic", dial_code: "+1-809", code: "DO" },
  { name: "Ecuador", dial_code: "+593", code: "EC" },
  { name: "Egypt", dial_code: "+20", code: "EG" },
  { name: "El Salvador", dial_code: "+503", code: "SV" },
  { name: "Equatorial Guinea", dial_code: "+240", code: "GQ" },
  { name: "Eritrea", dial_code: "+291", code: "ER" },
  { name: "Estonia", dial_code: "+372", code: "EE" },
  { name: "Eswatini (Swaziland)", dial_code: "+268", code: "SZ" },
  { name: "Ethiopia", dial_code: "+251", code: "ET" },
  { name: "Fiji", dial_code: "+679", code: "FJ" },
  { name: "Finland", dial_code: "+358", code: "FI" },
  { name: "France", dial_code: "+33", code: "FR" },
  { name: "Gabon", dial_code: "+241", code: "GA" },
  { name: "Gambia", dial_code: "+220", code: "GM" },
  { name: "Georgia", dial_code: "+995", code: "GE" },
  { name: "Germany", dial_code: "+49", code: "DE" },
  { name: "Ghana", dial_code: "+233", code: "GH" },
  { name: "Greece", dial_code: "+30", code: "GR" },
  { name: "Grenada", dial_code: "+1-473", code: "GD" },
  { name: "Guatemala", dial_code: "+502", code: "GT" },
  { name: "Guinea", dial_code: "+224", code: "GN" },
  { name: "Guinea-Bissau", dial_code: "+245", code: "GW" },
  { name: "Guyana", dial_code: "+592", code: "GY" },
  { name: "Haiti", dial_code: "+509", code: "HT" },
  { name: "Holy See", dial_code: "+379", code: "VA" },
  { name: "Honduras", dial_code: "+504", code: "HN" },
  { name: "Hungary", dial_code: "+36", code: "HU" },
  { name: "Iceland", dial_code: "+354", code: "IS" },
  { name: "India", dial_code: "+91", code: "IN" },
  { name: "Indonesia", dial_code: "+62", code: "ID" },
  { name: "Iran", dial_code: "+98", code: "IR" },
  { name: "Iraq", dial_code: "+964", code: "IQ" },
  { name: "Ireland", dial_code: "+353", code: "IE" },
  { name: "Israel", dial_code: "+972", code: "IL" },
  { name: "Italy", dial_code: "+39", code: "IT" },
  { name: "Jamaica", dial_code: "+1-876", code: "JM" },
  { name: "Japan", dial_code: "+81", code: "JP" },
  { name: "Jordan", dial_code: "+962", code: "JO" },
  { name: "Kazakhstan", dial_code: "+7", code: "KZ" },
  { name: "Kenya", dial_code: "+254", code: "KE" },
  { name: "Kiribati", dial_code: "+686", code: "KI" },
  { name: "Kuwait", dial_code: "+965", code: "KW" },
  { name: "Kyrgyzstan", dial_code: "+996", code: "KG" },
  { name: "Laos", dial_code: "+856", code: "LA" },
  { name: "Latvia", dial_code: "+371", code: "LV" },
  { name: "Lebanon", dial_code: "+961", code: "LB" },
  { name: "Lesotho", dial_code: "+266", code: "LS" },
  { name: "Liberia", dial_code: "+231", code: "LR" },
  { name: "Libya", dial_code: "+218", code: "LY" },
  { name: "Liechtenstein", dial_code: "+423", code: "LI" },
  { name: "Lithuania", dial_code: "+370", code: "LT" },
  { name: "Luxembourg", dial_code: "+352", code: "LU" },
  { name: "Madagascar", dial_code: "+261", code: "MG" },
  { name: "Malawi", dial_code: "+265", code: "MW" },
  { name: "Malaysia", dial_code: "+60", code: "MY" },
  { name: "Maldives", dial_code: "+960", code: "MV" },
  { name: "Mali", dial_code: "+223", code: "ML" },
  { name: "Malta", dial_code: "+356", code: "MT" },
  { name: "Marshall Islands", dial_code: "+692", code: "MH" },
  { name: "Mauritania", dial_code: "+222", code: "MR" },
  { name: "Mauritius", dial_code: "+230", code: "MU" },
  { name: "Mexico", dial_code: "+52", code: "MX" },
  { name: "Micronesia", dial_code: "+691", code: "FM" },
  { name: "Moldova", dial_code: "+373", code: "MD" },
  { name: "Monaco", dial_code: "+377", code: "MC" },
  { name: "Mongolia", dial_code: "+976", code: "MN" },
  { name: "Montenegro", dial_code: "+382", code: "ME" },
  { name: "Morocco", dial_code: "+212", code: "MA" },
  { name: "Mozambique", dial_code: "+258", code: "MZ" },
  { name: "Myanmar (Burma)", dial_code: "+95", code: "MM" },
  { name: "Namibia", dial_code: "+264", code: "NA" },
  { name: "Nauru", dial_code: "+674", code: "NR" },
  { name: "Nepal", dial_code: "+977", code: "NP" },
  { name: "Netherlands", dial_code: "+31", code: "NL" },
  { name: "New Zealand", dial_code: "+64", code: "NZ" },
  { name: "Nicaragua", dial_code: "+505", code: "NI" },
  { name: "Niger", dial_code: "+227", code: "NE" },
  { name: "Nigeria", dial_code: "+234", code: "NG" },
  { name: "North Korea", dial_code: "+850", code: "KP" },
  { name: "North Macedonia", dial_code: "+389", code: "MK" },
  { name: "Norway", dial_code: "+47", code: "NO" },
  { name: "Oman", dial_code: "+968", code: "OM" },
  { name: "Pakistan", dial_code: "+92", code: "PK" },
  { name: "Palau", dial_code: "+680", code: "PW" },
  { name: "Palestine State", dial_code: "+970", code: "PS" },
  { name: "Panama", dial_code: "+507", code: "PA" },
  { name: "Papua New Guinea", dial_code: "+675", code: "PG" },
  { name: "Paraguay", dial_code: "+595", code: "PY" },
  { name: "Peru", dial_code: "+51", code: "PE" },
  { name: "Philippines", dial_code: "+63", code: "PH" },
  { name: "Poland", dial_code: "+48", code: "PL" },
  { name: "Portugal", dial_code: "+351", code: "PT" },
  { name: "Qatar", dial_code: "+974", code: "QA" },
  { name: "Romania", dial_code: "+40", code: "RO" },
  { name: "Russia", dial_code: "+7", code: "RU" },
  { name: "Rwanda", dial_code: "+250", code: "RW" },
  { name: "Saint Kitts and Nevis", dial_code: "+1-869", code: "KN" },
  { name: "Saint Lucia", dial_code: "+1-758", code: "LC" },
  { name: "Saint Vincent and the Grenadines", dial_code: "+1-784", code: "VC" },
  { name: "Samoa", dial_code: "+685", code: "WS" },
  { name: "San Marino", dial_code: "+378", code: "SM" },
  { name: "Sao Tome and Principe", dial_code: "+239", code: "ST" },
  { name: "Saudi Arabia", dial_code: "+966", code: "SA" },
  { name: "Senegal", dial_code: "+221", code: "SN" },
  { name: "Serbia", dial_code: "+381", code: "RS" },
  { name: "Seychelles", dial_code: "+248", code: "SC" },
  { name: "Sierra Leone", dial_code: "+232", code: "SL" },
  { name: "Singapore", dial_code: "+65", code: "SG" },
  { name: "Slovakia", dial_code: "+421", code: "SK" },
  { name: "Slovenia", dial_code: "+386", code: "SI" },
  { name: "Solomon Islands", dial_code: "+677", code: "SB" },
  { name: "Somalia", dial_code: "+252", code: "SO" },
  { name: "South Africa", dial_code: "+27", code: "ZA" },
  { name: "South Korea", dial_code: "+82", code: "KR" },
  { name: "South Sudan", dial_code: "+211", code: "SS" },
  { name: "Spain", dial_code: "+34", code: "ES" },
  { name: "Sri Lanka", dial_code: "+94", code: "LK" },
  { name: "Sudan", dial_code: "+249", code: "SD" },
  { name: "Suriname", dial_code: "+597", code: "SR" },
  { name: "Sweden", dial_code: "+46", code: "SE" },
  { name: "Switzerland", dial_code: "+41", code: "CH" },
  { name: "Syria", dial_code: "+963", code: "SY" },
  { name: "Tajikistan", dial_code: "+992", code: "TJ" },
  { name: "Tanzania", dial_code: "+255", code: "TZ" },
  { name: "Thailand", dial_code: "+66", code: "TH" },
  { name: "Timor-Leste", dial_code: "+670", code: "TL" },
  { name: "Togo", dial_code: "+228", code: "TG" },
  { name: "Tonga", dial_code: "+676", code: "TO" },
  { name: "Trinidad and Tobago", dial_code: "+1-868", code: "TT" },
  { name: "Tunisia", dial_code: "+216", code: "TN" },
  { name: "Turkey", dial_code: "+90", code: "TR" },
  { name: "Turkmenistan", dial_code: "+993", code: "TM" },
  { name: "Tuvalu", dial_code: "+688", code: "TV" },
  { name: "Uganda", dial_code: "+256", code: "UG" },
  { name: "Ukraine", dial_code: "+380", code: "UA" },
  { name: "United Arab Emirates", dial_code: "+971", code: "AE" },
  { name: "United Kingdom", dial_code: "+44", code: "GB" },
  { name: "United States of America", dial_code: "+1", code: "US" },
  { name: "Uruguay", dial_code: "+598", code: "UY" },
  { name: "Uzbekistan", dial_code: "+998", code: "UZ" },
  { name: "Vanuatu", dial_code: "+678", code: "VU" },
  { name: "Venezuela", dial_code: "+58", code: "VE" },
  { name: "Vietnam", dial_code: "+84", code: "VN" },
  { name: "Yemen", dial_code: "+967", code: "YE" },
  { name: "Zambia", dial_code: "+260", code: "ZM" },
  { name: "Zimbabwe", dial_code: "+263", code: "ZW" }
];

const Profile = () => {
  // Basic profile states
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('');
  const [isAdult, setIsAdult] = useState(false);
  const [notifyQuestUpdates, setNotifyQuestUpdates] = useState(true);
  const [notifyRewardAlerts, setNotifyRewardAlerts] = useState(true);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [showResetForm, setShowResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetStatus, setResetStatus] = useState('');

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      alert("You are not logged in. Redirecting to the login page.");
      navigate('/login');
      return;
    }
    async function fetchUserData() {
      try {
        // Fetch the current user's data using the stored userId
        const response = await fetch(`http://localhost:5000/api/users/${storedUserId}`);
        if (!response.ok) throw new Error('Failed to fetch user data');
        const currentUser = await response.json();
        setUser(currentUser);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchUserData();
  }, [navigate]);

  // Pre-fill fields when user data is available
  useEffect(() => {
    if (user) {
      setWalletAddress(user.walletAddress || '');
      setCountry(user.country || '');
      setCity(user.city || '');
      setPhoneNumber(user.phoneNumber || '');
      setPhoneCountryCode(user.phoneCountryCode || '');
      setIsAdult(user.isAdult || false);
      if (user.profilePicture) {
        setProfilePicture(user.profilePicture);
      }
    }
  }, [user]);

  // Helper variable for user id (works with both id and _id)
  const userId = user ? (user.id || user._id) : null;

  // Basic account actions
  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    alert('Logged out successfully!');
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    if (
      window.confirm(
        'Are you sure you want to delete your account? This action cannot be undone.'
      )
    ) {
      try {
        const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          alert('Account deleted successfully.');
          navigate('/signup');
        } else {
          alert('Failed to delete account.');
        }
      } catch (error) {
        console.error('Error deleting account:', error);
        alert('An error occurred while deleting your account.');
      }
    }
  };

  // File/image handling
  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setProfilePictureFile(file);
      setProfilePicture(URL.createObjectURL(file));
    }
  };

  // Wallet input handling
  const handleWalletChange = (event) => setWalletAddress(event.target.value);

  // Connect to Phantom Wallet
  const connectWallet = async () => {
    if (window.solana && window.solana.isPhantom) {
      try {
        const response = await window.solana.connect();
        const publicKey = response.publicKey.toString();
        console.log('Connected with public key:', publicKey);
        setWalletAddress(publicKey);
      } catch (error) {
        console.error('Error connecting to Phantom Wallet:', error);
      }
    } else {
      alert('Phantom Wallet not found. Please install it from https://phantom.app/');
    }
  };

  // Save/update profile handler using FormData
  const handleSaveProfile = async () => {
    if (!country || !city) {
      alert('Country and City are required.');
      return;
    }
    if (!isAdult) {
      alert('You must confirm that you are 18+.');
      return;
    }

    const formData = new FormData();
    formData.append('walletAddress', walletAddress);
    formData.append('country', country);
    formData.append('city', city);
    formData.append('phoneCountryCode', phoneCountryCode);
    formData.append('phoneNumber', phoneNumber);
    formData.append('isAdult', isAdult);
    formData.append('notifyQuestUpdates', notifyQuestUpdates);
    formData.append('notifyRewardAlerts', notifyRewardAlerts);
    formData.append('username', user.username);

    if (profilePictureFile) {
      formData.append('profilePicture', profilePictureFile);
    }

    try {
      const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: 'PUT',
        body: formData
      });

      if (response.ok) {
        // Update the user state with the returned updated user object
        const result = await response.json();
        setUser(result.user);
        alert('Profile updated successfully!');
      } else {
        alert('Failed to update profile.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('An error occurred while updating your profile.');
    }
  };

  // Security & Anti-Fraud: manual account lock
  const handleLockAccount = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/users/${userId}/lock`, {
        method: 'POST'
      });
      if (response.ok) {
        alert('Account has been locked. Please contact support to unlock.');
      } else {
        alert('Failed to lock account.');
      }
    } catch (error) {
      console.error('Error locking account:', error);
      alert('An error occurred while locking your account.');
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleResetPassword = async () => {
    const newPassword = prompt('Enter your new password:');
    if (!newPassword) {
      alert('Password reset cancelled.');
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/users/${userId}/reset-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword })
      });
      if (response.ok) {
        alert('Password reset successfully!');
      } else {
        alert('Failed to reset password.');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('An error occurred while resetting your password.');
    }
  };

  // New function: Toggle the Reset Password Form
  const handleResetPasswordClick = () => {
    setShowResetForm(true);
  };

  // New function: Handle form submission for Reset Password
  const handleSubmitResetPassword = async (e) => {
    e.preventDefault();
  
    if (newPassword !== confirmPassword) {
      setResetStatus('Passwords do not match.');
      return;
    }
  
    try {
      const response = await fetch(`http://localhost:5000/api/users/${userId}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
      if (response.ok) {
        setResetStatus('Password reset successfully!');
        setNewPassword('');
        setConfirmPassword('');
        setShowResetForm(false);
      } else {
        const errorData = await response.json();
        setResetStatus(`Failed to reset password: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      setResetStatus('An error occurred while resetting your password.');
    }
  };

  // Implemented 2FA setup functionality
  const handleSetup2FA = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/users/${userId}/setup-2fa`, {
        method: 'POST'
      });
      if (response.ok) {
        await response.json();
        alert('2FA setup initiated. Please check your email or authenticator app for further instructions.');
      } else {
        alert('Failed to setup 2FA.');
      }
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      alert('An error occurred while setting up 2FA.');
    }
  };

  // Implemented KYC application functionality
  const handleApplyKYC = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/users/${userId}/apply-kyc`, {
        method: 'POST'
      });
      if (response.ok) {
        alert('KYC application submitted successfully!');
      } else {
        alert('Failed to submit KYC application.');
      }
    } catch (error) {
      console.error('Error applying for KYC:', error);
      alert('An error occurred while applying for KYC.');
    }
  };

  // Helper to build the correct profile picture URL
  const getProfileImageUrl = () => {
    // Use the locally stored profilePicture (from upload preview) if available
    let imgPath = profilePicture;
    if (!imgPath && user && user.profilePicture) {
      imgPath = user.profilePicture;
    }
    // If a path exists and starts with "uploads" (or contains backslashes), normalize it
    if (imgPath && imgPath.replace) {
      imgPath = imgPath.replace(/\\/g, '/'); // Replace backslashes with forward slashes
      if (imgPath.startsWith('uploads')) {
        return `http://localhost:5000/${imgPath}`;
      }
      return imgPath;
    }
    return 'default-profile.png';
  };

  if (loading) return <p>Loading user data...</p>;
  if (!user) return <p>No user data available.</p>;

  // Dummy badge data for demonstration
  const goodDeedsBadges = [
    { id: 1, name: 'First Good Deed', description: 'Complete 1 quest' },
    { id: 2, name: 'Kind Soul', description: 'Complete 10 quests' },
    { id: 3, name: 'Virtuous', description: 'Complete 50 quests' },
    { id: 4, name: 'Angel of the Streets', description: 'Complete 100 quests' }
  ];

  const confessionsBadges = [
    { id: 1, name: 'First Confession', description: 'Post 1 confession' },
    { id: 2, name: 'Confession King', description: 'Post 50 confessions' },
    { id: 3, name: 'Soul Seeker', description: 'Get 500 votes on confessions' },
    { id: 4, name: 'Honest Heart', description: 'Most voted confession of the week' }
  ];

  const cryptoInvestorBadges = [
    { id: 1, name: 'First SNV2 Holder', description: 'Purchase SNV2 in Presale' },
    { id: 2, name: 'Crypto Whale', description: 'Own 500K+ SNV2' },
    { id: 3, name: 'Top Investor', description: 'Be in the Top 10 investors' },
    { id: 4, name: 'Diamond Hands', description: 'Hold SNV2 for 6+ months' }
  ];

  const nftCollectorBadges = [
    { id: 1, name: 'First NFT', description: 'Own 1 NFT from the Marketplace' },
    { id: 2, name: 'NFT Enthusiast', description: 'Own 5 NFTs' },
    { id: 3, name: 'Collector', description: 'Own 10 NFTs' },
    { id: 4, name: 'Rare Artifact', description: 'Own a rare or limited edition NFT' }
  ];

  const close = () => navigate('/');

  return (
    <div className="profile-page">
      <div className="profile-container">
        <span className="close-btn" onClick={close}>
          <span role="img" aria-label="close">❌</span>
        </span>
        <h1>Profile</h1>
        <h3>
          Welcome, <strong style={{ color: '#ffeb3b' }}>
            {user.firstName + " " + user.lastName || 'Unknown User'}
          </strong>!
        </h3>

        <div className="profile-details">
          {/* Profile Picture */}
          <div className="profile-picture">
            <img
              src={getProfileImageUrl()}
              alt="Profile"
              className="profile-img"
              style={{ width: '150px', height: '150px', objectFit: 'cover' }}
            />
            <input type="file" accept="image/*" onChange={handleImageChange} className="upload-file" />
          </div>

          {/* Basic Profile Information */}
          <div className="user-info">
            <label>Username:</label>
            <b>
              <p style={{ fontSize: 'larger', color: '#ffeb3b' }}>
                {user.username || 'Not set'}
              </p>
            </b>
          </div>

          <div className="user-info">
            <label>Email:</label>
            <p style={{ fontSize: '1rem', color: '#ffeb3b' }}>
              {user.email || 'No email available'}{' '}
              (<span role="img" aria-label="verified">✅</span>)
            </p>
          </div>

          <div className="user-info">
            <label>Wallet Phantom:</label>
            <input
              type="text"
              value={walletAddress}
              onChange={handleWalletChange}
              placeholder="Enter Phantom Wallet Address"
              style={{ textAlign: 'center' }}
            />
            <button onClick={connectWallet} className="btn">
              Connect Phantom Wallet
            </button>
          </div>

          <div className="user-info">
            <label>18+ Confirmation:</label>
            <input
              type="checkbox"
              checked={isAdult}
              onChange={(e) => setIsAdult(e.target.checked)}
            />{' '}
            I confirm that I am 18+
          </div>

          <div className="user-info">
            <label>Level & XP:</label>
            <p>
              Level {user.level || 1}, XP: {user.xp || 0}
            </p>
          </div>

          <div className="user-info">
            <label>Total SNV2 Held:</label>
            <p>{user.snv2 || 0}</p>
          </div>

          <div className="user-info">
            <label>Total Good Deeds Completed:</label>
            <p>{user.goodDeeds || 0}</p>
          </div>

          <div className="user-info">
            <label>Total Confessions Posted:</label>
            <p>{user.confessions || 0}</p>
          </div>

          <div className="user-info">
            <label>Total NFTs Owned:</label>
            <p>{user.nfts || 0}</p>
          </div>

          {/* Quest Tracking & Progress */}
          <div className="user-info">
            <label>Current Quest & Status:</label>
            <p>{user.currentQuest || 'No active quest'}</p>
          </div>

          <div className="user-info">
            <label>Completed Quests:</label>
            {user.completedQuests && user.completedQuests.length > 0 ? (
              <ul>
                {user.completedQuests.map((quest, index) => (
                  <li key={index}>{quest}</li>
                ))}
              </ul>
            ) : (
              <p>No completed quests</p>
            )}
          </div>

          <div className="user-info">
            <label>Upcoming Quests:</label>
            {user.upcomingQuests && user.upcomingQuests.length > 0 ? (
              <ul>
                {user.upcomingQuests.map((quest, index) => (
                  <li key={index}>{quest}</li>
                ))}
              </ul>
            ) : (
              <p>No upcoming quests</p>
            )}
          </div>

          <div className="user-info">
            <label>Leaderboard Rank:</label>
            <p>#{user.rank || 'Unranked'}</p>
          </div>

          {/* Location & Verification */}
          <div className="user-info">
            <label>Country:</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              style={{ textAlign: 'center', color: '#fff', backgroundColor: 'rgba(0,0,0,0.8)' }}
              className="btn"
            >
              <option value="">Select your country</option>
              {countries.map((countryName, index) => (
                <option key={index} value={countryName}>
                  {countryName}
                </option>
              ))}
            </select>
          </div>

          <div className="user-info">
            <label>City:</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter your city"
              style={{ textAlign: 'center' }}
            />
          </div>

          {/* Country Code Dropdown for Phone Number */}
          <div className="user-info">
            <label>Country Code:</label>
            <select
              value={phoneCountryCode}
              onChange={(e) => setPhoneCountryCode(e.target.value)}
              style={{ textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.8)', color: '#fff' }}
              className="btn"
            >
              <option value="">Select country code</option>
              {countryCodes.map((item, index) => (
                <option key={index} value={item.dial_code}>
                  {item.name} ({item.dial_code})
                </option>
              ))}
            </select>
          </div>

          <div className="user-info">
            <label>Phone Number:</label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter your phone number (optional)"
              style={{ textAlign: 'center'}}
            />
          </div>

          <div className="user-info">
            <label>Account Verification Status:</label>
            <p>
              {user.accountVerified ? 'Verified' : 'Unverified'}{' '}
              <span role="img" aria-label={user.accountVerified ? 'verified' : 'warning'}>
                {user.accountVerified ? '✅' : '⚠️'}
              </span>
            </p>
          </div>

          {/* Notification Preferences */}
          <div className="user-info">
            <label>Notification Preferences:</label>
            <div>
              <input
                type="checkbox"
                checked={notifyQuestUpdates}
                onChange={(e) => setNotifyQuestUpdates(e.target.checked)}
              />{' '}
              <br />
              Quest Updates
            </div>
            <div>
              <input
                type="checkbox"
                checked={notifyRewardAlerts}
                onChange={(e) => setNotifyRewardAlerts(e.target.checked)}
              />{' '}
              Reward Alerts
            </div>
          </div>

          {/* Security & Anti-Fraud Measures */}
          <div className="security-section">
            <h2>Security Settings</h2>
            <p>• 1 Account per IP & Device enforced.</p>
            <p>• Wallet changes require email confirmation.</p>
            <p>• New IP login notifications are active.</p>
            <button onClick={handleLockAccount} className="btn">
              Lock Account
            </button>
            <button onClick={() => alert('Reporting system coming soon')} className="btn">
              Report Fraud/Abuse
            </button>
          </div>

          {/* Actions & Settings */}
          <div className="actions-section">
            <button onClick={handleResetPasswordClick} className="btn">
              Reset Password
            </button>
            {!showResetForm && resetStatus && <p className="reset-message">{resetStatus}</p>}
            <button onClick={handleSetup2FA} className="btn">
              Setup Two-Factor Authentication (2FA)
            </button>
            {user.level >= 10 && (
              <button onClick={handleApplyKYC} className="btn">
                Apply for KYC
              </button>
            )}
          </div>

          {/* Reset Password Form */}
          {showResetForm && (
            <div className="reset-password-form">
              <h3>Reset Password</h3>
              <form onSubmit={handleSubmitResetPassword}>
                <input
                  type="password"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button type="submit" className="btn">
                  Submit
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setShowResetForm(false);
                    setResetStatus('');
                  }}
                >
                  Cancel
                </button>
              </form>
              {resetStatus && <p>{resetStatus}</p>}
            </div>
          )}

          {/* Badge System & Achievements */}
          <div className="badges-section">
            <h2>Achievements & Badges</h2>
            <div className="badge-category">
              <h3>Good Deeds Badges</h3>
              <ul>
                {goodDeedsBadges.map((badge) => (
                  <li key={badge.id}>
                    <strong>{badge.name}</strong>: {badge.description}
                  </li>
                ))}
              </ul>
            </div>
            <div className="badge-category">
              <h3>Confessions Badges</h3>
              <ul>
                {confessionsBadges.map((badge) => (
                  <li key={badge.id}>
                    <strong>{badge.name}</strong>: {badge.description}
                  </li>
                ))}
              </ul>
            </div>
            <div className="badge-category">
              <h3>Crypto Investor Badges</h3>
              <ul>
                {cryptoInvestorBadges.map((badge) => (
                  <li key={badge.id}>
                    <strong>{badge.name}</strong>: {badge.description}
                  </li>
                ))}
              </ul>
            </div>
            <div className="badge-category">
              <h3>NFT Collector Badges</h3>
              <ul>
                {nftCollectorBadges.map((badge) => (
                  <li key={badge.id}>
                    <strong>{badge.name}</strong>: {badge.description}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Save, Logout & Delete Account Buttons */}
          <div className="button-group">
            <button onClick={handleSaveProfile} className="btn">
              Save Profile
            </button>
            <button onClick={handleLogout} className="logout-button btn">
              Logout
            </button>
            <button onClick={handleDeleteAccount} className="delete-button btn" style={{ color: 'red' }}>
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
