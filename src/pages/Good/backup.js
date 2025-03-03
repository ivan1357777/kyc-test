import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './good.css';

// Quest templates simulating the daily quest assignment
const questTemplates = [
  { 
    id: 1, 
    category: 'Easy', 
    description: 'Feed a stray dog.', 
    reward: { SNV2: 50, XP: 10 } 
  },
  { 
    id: 2, 
    category: 'Moderate', 
    description: 'Participate in a local recycling drive.', 
    reward: { SNV2: 150, XP: 25 } 
  },
  { 
    id: 3, 
    category: 'Hard', 
    description: 'Lead a community environmental campaign.', 
    reward: { SNV2: 500, XP: 50, badge: 'Exclusive Badge' } 
  }
];

// Dummy user data simulating a logged-in user
const dummyUser = {
  id: 1,
  SNV2: 500,
  XP: 30,
  completedQuests: [],
  badges: [],
  isAdmin: false,   // Toggle this to true to simulate admin access
  hasVoted: false,  // Track whether the user has voted for this week
};

const GoodDeeds = () => {
  const [user, setUser] = useState(dummyUser);
  const [currentQuest, setCurrentQuest] = useState(null);
  const [proof, setProof] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvedImages, setApprovedImages] = useState([]); // Global approved images
  const [pendingImages, setPendingImages] = useState([]);   // Images awaiting admin approval
  const [pendingModalImage, setPendingModalImage] = useState(null); // For full screen modal view

  const navigate = useNavigate();

  // ===== ADMIN AUTHENTICATION STATE & FUNCTIONS =====
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminAccessText, setAdminAccessText] = useState('');
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [generatedAdminCode, setGeneratedAdminCode] = useState('');
  const [adminVerified, setAdminVerified] = useState(false);

  // Helper function to get the current date string in Romania time
  const getRomaniaDateString = () => {
    return new Date().toLocaleDateString('en-US', { timeZone: 'Europe/Bucharest' });
  };

  useEffect(() => {
    const storedAdminVerified = localStorage.getItem('adminVerified');
    if (storedAdminVerified === 'true') {
      setAdminVerified(true);
    }
  }, []);

  const generateAdminCode = () => {
    const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
    const today = getRomaniaDateString();
    return `${today}-${randomString}`;
  };

  const expectedAccessText = "try123";

  const handleSendAdminCode = async () => {
    if (!adminEmail) {
      setStatus('Please enter a valid email address for admin access.');
      return;
    }
    if (adminAccessText !== expectedAccessText) {
      setStatus('Access text is incorrect.');
      return;
    }
    const code = generateAdminCode();
    setGeneratedAdminCode(code);
    try {
      const response = await fetch('http://localhost:5000/api/send-admin-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, code: code }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send admin code.');
      }
      setStatus('Admin code sent to your email.');
    } catch (error) {
      setStatus('Error sending admin code: ' + error.message);
    }
  };

  const handleVerifyAdminCode = () => {
    if (adminCodeInput === generatedAdminCode) {
      setAdminVerified(true);
      localStorage.setItem('adminVerified', 'true');
      setStatus('Admin verified! Access granted.');
      setShowAdminInput(false);
    } else {
      setStatus('Incorrect admin code. Please try again.');
    }
  };

  const handleAdminLogout = () => {
    setAdminVerified(false);
    localStorage.removeItem('adminVerified');
    setGeneratedAdminCode('');
    setAdminCodeInput('');
    setAdminEmail('');
    setAdminAccessText('');
    setStatus('Admin logged out.');
  };

  // If you previously used this function to navigate away, remove or modify it:
  const openAdminPanel = () => {
    // Instead of navigating to another page, display additional admin controls here if needed.
    if (user.isAdmin) {
      setStatus('Admin panel is active on this page.');
    } else {
      setStatus('Access denied. Admins only.');
    }
  };

  // Global keydown listener to intercept PrintScreen (not foolproof)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        alert("Screenshots are disabled!");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Load approved images from the global store (with fallback to localStorage)
  useEffect(() => {
    fetch('http://localhost:5000/api/approved-images')
      .then(res => res.json())
      .then(data => {
        console.log('Global approvedImages from server:', data);
        setApprovedImages(data);
        localStorage.setItem('approvedImages', JSON.stringify(data));
      })
      .catch(err => {
        console.error('Error fetching global approved images:', err);
        const storedImages = localStorage.getItem('approvedImages');
        if (storedImages) {
          try {
            const parsed = JSON.parse(storedImages);
            console.log('Using localStorage approvedImages:', parsed);
            setApprovedImages(parsed);
          } catch (e) {
            console.error('Error parsing approvedImages from localStorage', e);
          }
        }
      });
  }, []);

  // Persist approved images array to localStorage as a cache
  useEffect(() => {
    const jsonString = JSON.stringify(approvedImages);
    console.log('Saving approvedImages to localStorage:', jsonString);
    const MAX_STORAGE_LENGTH = 5000000; // 5,000,000 characters threshold
    if (jsonString.length > MAX_STORAGE_LENGTH) {
      console.warn("approvedImages data is too large, skipping save.");
      return;
    }
    try {
      localStorage.setItem('approvedImages', jsonString);
    } catch (e) {
      console.error('Error saving approvedImages to localStorage', e);
    }
  }, [approvedImages]);

  // Scheduled clearing of approved images at Romania midnight.
  // Clears both the global store and localStorage.
  useEffect(() => {
    let timerId;

    const getRomaniaTime = () => {
      return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Bucharest" }));
    };

    const getTimeUntilRomaniaMidnight = () => {
      const nowRomania = getRomaniaTime();
      const nextMidnightRomania = new Date(nowRomania);
      nextMidnightRomania.setHours(24, 0, 0, 0);
      let delay = nextMidnightRomania.getTime() - nowRomania.getTime();
      if (delay <= 0) delay = 86400000;
      return delay;
    };

    const scheduleDeletion = () => {
      const delay = getTimeUntilRomaniaMidnight();
      console.log("Scheduling approved images deletion in", delay, "ms");
      timerId = setTimeout(() => {
        fetch('http://localhost:5000/api/approved-images', { method: 'DELETE' })
          .then(() => {
            console.log("Global approved images cleared at Romania midnight.");
            setApprovedImages([]);
            localStorage.removeItem('approvedImages');
          })
          .catch(err => console.error('Error clearing global approved images:', err));
        scheduleDeletion(); // Reschedule for next midnight
      }, delay);
    };

    scheduleDeletion();
    return () => clearTimeout(timerId);
  }, []);

  useEffect(() => {
    assignDailyQuest();
  }, []);

  // Assign a new daily quest
  const assignDailyQuest = () => {
    const randomIndex = Math.floor(Math.random() * questTemplates.length);
    setCurrentQuest(questTemplates[randomIndex]);
    setProof(null);
    setStatus('');
    setError('');
  };

  // Refresh daily quest for testing
  const refreshDailyQuest = () => {
    assignDailyQuest();
    setStatus('New daily quest assigned!');
  };

  // Compute effective reward after 1.8% burn
  const computeEffectiveReward = (reward) => {
    const burnedSNV2 = Math.floor(reward.SNV2 * 0.018);
    return { SNV2: reward.SNV2 - burnedSNV2, XP: reward.XP };
  };

  // Validate file input
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileType = file.type;
      if (fileType.startsWith('image/') || fileType.startsWith('video/')) {
        setProof(file);
        setError('');
      } else {
        setError('Only images and videos are allowed.');
        setProof(null);
      }
    }
  };

  // Upload image file to the server
  const uploadImageToServer = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    try {
      const response = await fetch('http://localhost:5000/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      console.log('Image upload response:', data);
      return data.url.replace(/\\/g, '/');
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  // Handle proof submission with admin approval for images
  const handleProofSubmission = async () => {
    if (!currentQuest) {
      setStatus('No active quest assigned.');
      return;
    }
    if (!proof) {
      setStatus('Please upload proof before submitting.');
      return;
    }
    if (user.completedQuests.find(q => q.id === currentQuest.id)) {
      setStatus('You have already submitted proof for this quest.');
      return;
    }

    setIsSubmitting(true);
    setStatus('Proof submitted! Processing...');

    setTimeout(async () => {
      const effectiveReward = computeEffectiveReward(currentQuest.reward);
      setUser(prevUser => {
        const updatedUser = {
          ...prevUser,
          SNV2: prevUser.SNV2 + effectiveReward.SNV2,
          XP: prevUser.XP + effectiveReward.XP,
          completedQuests: [...prevUser.completedQuests, currentQuest],
        };
        if (currentQuest.category === 'Hard' && currentQuest.reward.badge) {
          updatedUser.badges = [...updatedUser.badges, currentQuest.reward.badge];
        }
        return updatedUser;
      });
      // If the proof is an image, upload it and add to pending approvals
      if (proof && proof.type.startsWith('image/')) {
        try {
          const imageUrl = await uploadImageToServer(proof);
          // Fix backslashes in the URL already done in uploadImageToServer
          console.log('New submitted image URL (pending approval):', imageUrl);
          // Update pending images using functional update to ensure state consistency
          setPendingImages(prev => {
            const newImages = [...prev, imageUrl];
            console.log('Updated pendingImages:', newImages);
            return newImages;
          });
          setStatus('Proof submitted! Awaiting admin approval...');
        } catch (err) {
          console.error('Error uploading image:', err);
        }
      }
      setIsSubmitting(false);
      setProof(null);
    }, 3000);
  };

  // ====== NEW USEEFFECT: FETCH SERVER'S PENDING IMAGES IF ADMIN ======
  useEffect(() => {
    if (adminVerified) {
      fetch('http://localhost:5000/api/pending-images')
        .then(res => res.json())
        .then(data => {
          console.log('Fetched pending images from server:', data);
          setPendingImages(data);
        })
        .catch(err => console.error('Error fetching pending images:', err));
    }
  }, [adminVerified]);
  // ================================================================

  // Handle community voting
  const handleVote = () => {
    if (user.XP < 50) {
      setStatus('Insufficient XP to vote for the next hard quest.');
      return;
    }
    if (user.hasVoted) {
      setStatus('You have already voted for this week.');
      return;
    }
    setUser(prevUser => ({ ...prevUser, hasVoted: true }));
    setStatus('Thank you for voting for the next hard quest!');
  };

  // Handle admin approval of a pending image
  const handleApproveImage = (index) => {
    const imageUrl = pendingImages[index];
    // Update global store via POST endpoint as before
    fetch('http://localhost:5000/api/approved-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: imageUrl }),
    })
      .then(res => res.json())
      .then(data => {
        console.log('Global approved image saved:', data);
        setApprovedImages(prev => [...prev, imageUrl]);

        // ALSO remove the image from server's pending array
        fetch(`http://localhost:5000/api/pending-images/${index}`, {
          method: 'DELETE',
        })
          .then(delRes => delRes.json())
          .then(() => {
            // Remove image from local pending state
            setPendingImages(prev => prev.filter((_, i) => i !== index));
          })
          .catch(err => console.error('Error removing pending image from server:', err));
      })
      .catch(err => console.error('Error saving global approved image:', err));
  };

  // Handle admin declining a pending image
  const handleDeclineImage = (index) => {
    // Remove the image from the server's pending array
    fetch(`http://localhost:5000/api/pending-images/${index}`, {
      method: 'DELETE',
    })
      .then(res => res.json())
      .then(() => {
        // Then remove image from local state
        setPendingImages(prev => prev.filter((_, i) => i !== index));
      })
      .catch(err => console.error('Error removing pending image from server:', err));
  };

  // Close/navigate back to home page
  const closePage = () => {
    navigate('/');
  };

  return (
    <div className="good-page">
      <div className="good-container">
        <span className="close-btn" onClick={closePage}>
          <span role="img" aria-label="close">❌</span>
        </span>
        <br />
        {/* ADMIN/LOGOUT BUTTON */}
        {adminVerified ? (
          <>
            <button onClick={handleAdminLogout} className='btn'>Logout</button>
          </>
        ) : (
          <button onClick={() => setShowAdminInput(true)} className='btn'>Admin</button>
        )}

        {/* ADMIN AUTHENTICATION PANEL */}
        {showAdminInput && !adminVerified && (
          <div className="admin-auth">
            <h3>Admin Access</h3>
            <input
              type="email"
              placeholder="Enter admin email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
            />
            <input
              type="text"
              placeholder="Enter access text"
              value={adminAccessText}
              onChange={(e) => setAdminAccessText(e.target.value)}
            />
            <button onClick={handleSendAdminCode}>Send Code</button>
            {generatedAdminCode && (
              <>
                <input
                  type="text"
                  placeholder="Enter the code you received"
                  value={adminCodeInput}
                  onChange={(e) => setAdminCodeInput(e.target.value)}
                />
                <button onClick={handleVerifyAdminCode}>Verify Code</button>
              </>
            )}
          </div>
        )}

        {adminVerified && (
          <div className="admin-access-granted">
            <h3>Welcome Admin!</h3>
            <p>You are allowed to accept "GOOD DEEDS" and also you are allowed to delete any "GOOD DEEDS"</p>
          </div>
        )}

        <h1>Good Deeds</h1>
        <p>Complete daily quests to earn rewards and contribute to positive change!</p>
        
        {currentQuest ? (
          <div className="quest-display">
            <h3>Today's Quest: {currentQuest.category} - {currentQuest.description}</h3>
            <p>
              Reward: {currentQuest.reward.SNV2} SNV2 (1.8% burned on transaction) + {currentQuest.reward.XP} XP
              {currentQuest.category === 'Hard' && currentQuest.reward.badge ? ` + ${currentQuest.reward.badge}` : ''}
            </p>
            <input 
              className="upload-file"
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
            />
            {error && <p className="error-message" style={{ color: 'red' }}>{error}</p>}
            <button onClick={handleProofSubmission} className="btn" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Proof'}
            </button>
          </div>
        ) : (
          <p>No quest assigned for today.</p>
        )}

        <div className="quest-status">
          <h3 style={{ color: '#ffeb3b' }}>Status: {status}</h3>
        </div>

        <div className="user-dashboard">
          <h3 style={{ color: '#ffeb3b' }}>User Dashboard</h3>
          <p>Total SNV2: {user.SNV2}</p>
          <p>Total XP: {user.XP}</p>
          <h4>Achievements & Badges:</h4>
          {user.badges.length > 0 ? (
            <ul>
              {user.badges.map((badge, index) => (
                <li key={index}>{badge}</li>
              ))}
            </ul>
          ) : (
            <p>No badges earned yet.</p>
          )}
          <h4>Completed Quests:</h4>
          {user.completedQuests.length > 0 ? (
            <ul>
              {user.completedQuests.map((quest, index) => (
                <li key={index}>
                  {quest.category}: {quest.description} — Earned {quest.reward.SNV2} SNV2 + {quest.reward.XP} XP
                </li>
              ))}
            </ul>
          ) : (
            <p>No quests completed yet.</p>
          )}
        </div>

        <div className="voting-section">
          <h3 style={{ color: '#ffeb3b' }}>Vote for Next Hard Quest</h3>
          <button onClick={handleVote} className="btn">
            Vote for Next Hard Quest
          </button>
        </div>

        {user.isAdmin && (
          <div className="admin-panel">
            <h3>Admin Control Panel</h3>
            <button onClick={openAdminPanel} className="btn">
              Show Admin Controls
            </button>
          </div>
        )}

        <div className="refresh-quest">
          <button onClick={refreshDailyQuest} className="btn">
            Assign New Daily Quest (Test)
          </button>
        </div>

        {/* Approved Images Section */}
        <div className="approved-images-container">
          <h2>Approved Images</h2>
          <ApprovedImagesPagination approvedImages={approvedImages} />
        </div>

        {/* Pending Images Section for Admin Approval - Only visible if admin is logged in */}
        {adminVerified && pendingImages.length > 0 && (
          <div className="pending-images-container">
            <h2>Pending Images for Approval</h2>
            {pendingImages.map((imgUrl, index) => (
              <div key={index} className="pending-image-item">
                <img
                  src={imgUrl}
                  alt={`Pending ${index + 1}`}
                  className="thumbnail"
                  onClick={() => setPendingModalImage(imgUrl)}
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                  onError={(e) => { 
                    console.error('Error loading image:', imgUrl);
                    e.target.src = 'fallback-image-url.png';
                  }}
                />
                <button onClick={() => handleApproveImage(index)} className="btn">Approve</button>
                <button onClick={() => handleDeclineImage(index)} className="btn">Decline</button>
              </div>
            ))}
          </div>
        )}

        {/* Modal for Pending Images */}
        {pendingModalImage && (
          <div className="fullscreen-modal" onClick={() => setPendingModalImage(null)}>
            <img 
              src={pendingModalImage} 
              alt="Full screen pending view" 
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              style={{ userSelect: 'none' }}
              onError={(e) => { 
                console.error('Error loading modal image:', pendingModalImage);
                e.target.src = 'fallback-image-url.png';
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Component to display approved images with pagination
const ApprovedImagesPagination = ({ approvedImages }) => {
  console.log('ApprovedImagesPagination received:', approvedImages);
  const images = approvedImages || [];
  const imagesPerPage = 10;
  const totalPages = Math.ceil(images.length / imagesPerPage);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalImage, setModalImage] = useState(null);

  if (images.length === 0) {
    return <p>No approved images yet.</p>;
  }

  const indexOfLastImage = currentPage * imagesPerPage;
  const indexOfFirstImage = indexOfLastImage - imagesPerPage;
  const currentImages = images.slice(indexOfFirstImage, indexOfLastImage);

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handlePageSelect = (page) => {
    setCurrentPage(page);
  };

  return (
    <div>
      <div className="images-grid">
        {currentImages.map((imgUrl, index) => (
          <div key={index} className="image-item">
            <img
              src={imgUrl}
              alt={`Approved ${index + indexOfFirstImage + 1}`}
              className="thumbnail"
              onClick={() => setModalImage(imgUrl)}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              onError={(e) => { 
                console.error('Error loading image:', imgUrl);
                e.target.src = 'fallback-image-url.png';
              }}
            />
          </div>
        ))}
      </div>
      <div className="pagination">
        <button onClick={goToPrevPage} disabled={currentPage === 1}>Prev</button>
        {[...Array(totalPages)].map((_, idx) => (
          <button
            key={idx}
            onClick={() => handlePageSelect(idx + 1)}
            className={currentPage === idx + 1 ? 'active' : ''}
          >
            {idx + 1}
          </button>
        ))}
        <button onClick={goToNextPage} disabled={currentPage === totalPages}>Next</button>
      </div>
      {modalImage && (
        <div className="fullscreen-modal" onClick={() => setModalImage(null)}>
          <img 
            src={modalImage} 
            alt="Full screen view" 
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            style={{ userSelect: 'none' }}
            onError={(e) => { 
              console.error('Error loading modal image:', modalImage);
              e.target.src = 'fallback-image-url.png';
            }}
          />
        </div>
      )}
    </div>
  );
};

export default GoodDeeds;
