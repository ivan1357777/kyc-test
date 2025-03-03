import React, { useState, useEffect, useRef } from 'react';
import './confess.css';
import { useNavigate } from 'react-router-dom';

// Helper function to generate referral code in the format "username-XXXXXX"
const generateReferralCode = (username) => {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${username}-${randomPart}`;
};

// Helper function to get the current date string in Romania time
const getRomaniaDateString = () => {
  return new Date().toLocaleDateString('en-US', { timeZone: 'Europe/Bucharest' });
};

const ConfessAndEarn = () => {
  const navigate = useNavigate();

  // ─── ADMIN VERIFICATION ─────────────────────────────
  const [adminVerified, setAdminVerified] = useState(false);
  useEffect(() => {
    const storedAdminVerified = localStorage.getItem('adminVerified');
    if (storedAdminVerified === 'true') {
      setAdminVerified(true);
    }
  }, []);

  // ─── USER PROFILE STATE ─────────────────────────────
  const [username, setUsername] = useState('');
  const [userProfile, setUserProfile] = useState(() => {
    const saved = sessionStorage.getItem('userProfile');
    const today = getRomaniaDateString();
    if (saved) {
      const profile = JSON.parse(saved);
      if (profile.referralCodeDate !== today) {
        const usernameForReferral = profile.username || 'Guest';
        profile.referralCode = generateReferralCode(usernameForReferral);
        profile.referralCodeDate = today;
      }
      return profile;
    } else {
      return {
        tokenBalance: 0,
        badges: [],
        username: '',
        referralCode: generateReferralCode('Guest'),
        referralCodeDate: today,
      };
    }
  });
  useEffect(() => {
    sessionStorage.setItem('userProfile', JSON.stringify(userProfile));
  }, [userProfile]);

  // ─── FETCH CURRENT USER DATA ─────────────────────────────
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      console.warn('No user logged in. Please log in.');
      setUsername('');
      return;
    }
    fetch(`http://localhost:5000/api/users/${storedUserId}`)
      .then((res) => res.json())
      .then((data) => {
        console.log('Fetched user data:', data);
        setUsername(data.username);
        const today = getRomaniaDateString();
        setUserProfile((prev) => {
          if (prev.referralCodeDate === today) {
            return { ...prev, username: data.username };
          } else {
            return { 
              ...prev, 
              username: data.username, 
              referralCode: generateReferralCode(data.username), 
              referralCodeDate: today 
            };
          }
        });
      })
      .catch((err) => console.error('Error fetching user data:', err));
  }, []);

  // ─── CONFESSIONS & RELATED STATES ─────────────────────────────
  const [freeDeletionsToday, setFreeDeletionsToday] = useState(0);
  const [confessions, setConfessions] = useState([]);
  const [pendingConfessions, setPendingConfessions] = useState([]); // Pending confessions awaiting admin approval
  const [newConfession, setNewConfession] = useState({
    text: '',
    type: 'public',
    file: null,
    video: null,
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [systemMessage, setSystemMessage] = useState('');
  const [rewardInfo, setRewardInfo] = useState({
    dailyRewards: 50,
    weeklyRewards: 150,
    dailyTop: 3,
    weeklyTop: 3,
  });
  const [voteErrors, setVoteErrors] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const confessionsPerPage = 10;

  // ─── NEW: State for selected video modal ─────────────────────────────
  const [selectedVideo, setSelectedVideo] = useState(null);

  // ─── BroadcastChannel Setup ─────────────────────────────
  const channelRef = useRef(null);
  useEffect(() => {
    channelRef.current = new BroadcastChannel('confessions_channel');
    channelRef.current.onmessage = (event) => {
      if (event.data.type === 'update') {
        setConfessions(event.data.confessions);
      }
    };
    return () => {
      channelRef.current.close();
    };
  }, []);

  const fetchConfessions = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/confessions');
      const data = await response.json();
      setConfessions(data);
    } catch (error) {
      console.error('Error fetching confessions:', error);
    }
  };
  useEffect(() => {
    fetchConfessions();
  }, []);

  // If admin, fetch pending confessions from the server
  useEffect(() => {
    if (adminVerified) {
      fetch('http://localhost:5000/api/confessions/pending')
        .then((res) => res.json())
        .then((data) => {
          console.log('Fetched pending confessions from server:', data);
          setPendingConfessions(data);
        })
        .catch((err) => console.error('Error fetching pending confessions:', err));
    }
  }, [adminVerified]);

  const getTodayConfessionsCount = () => {
    const today = getRomaniaDateString();
    return confessions.filter(
      (conf) =>
        new Date(conf.timestamp).toLocaleDateString('en-US', { timeZone: 'Europe/Bucharest' }) === today &&
        conf.user === userProfile.referralCode
    ).length;
  };

  // ─── HANDLERS FOR CONFESSION INPUTS ─────────────────────────────
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewConfession({ ...newConfession, [name]: value });
  };

  // Updated file change handler for images
  const handleFileChange = async (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!validImageTypes.includes(file.type)) {
        setSystemMessage('Only image files (JPEG, PNG, GIF) are allowed.');
        setNewConfession({ ...newConfession, file: null });
        setImagePreview(null);
        return;
      }
      const formData = new FormData();
      formData.append('image', file);
      formData.append('referralCode', userProfile.referralCode);
      try {
        const response = await fetch('http://localhost:5000/api/confessions/upload-temp-image', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (response.ok) {
          setImagePreview(data.url);
          setNewConfession((prev) => ({ ...prev, file: data.url }));
        } else {
          setSystemMessage(data.error || 'Error uploading image.');
        }
      } catch (error) {
        console.error(error);
        setSystemMessage('Error uploading image. Please try again.');
      }
    }
  };

  // Updated video change handler that uploads via FormData
  const handleVideoChange = (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
      if (!validVideoTypes.includes(file.type)) {
        setSystemMessage('Only video files (MP4, WebM, Ogg) are allowed.');
        setNewConfession({ ...newConfession, video: null });
        setVideoPreview(null);
        return;
      }
      const videoURL = URL.createObjectURL(file);
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.src = videoURL;
      videoElement.onloadedmetadata = async () => {
        window.URL.revokeObjectURL(videoURL);
        if (videoElement.duration > 30) {
          setSystemMessage('Video must be at most 30 seconds.');
          setNewConfession({ ...newConfession, video: null });
          setVideoPreview(null);
        } else {
          const formData = new FormData();
          formData.append('video', file);
          formData.append('referralCode', userProfile.referralCode);
          console.log("Uploading video...");
          try {
            const response = await fetch('http://localhost:5000/api/confessions/upload-temp-video', {
              method: 'POST',
              body: formData,
            });
            const data = await response.json();
            console.log("Video upload response:", data);
            if (response.ok) {
              setVideoPreview(data.url);
              setNewConfession((prev) => ({ ...prev, video: data.url }));
              setSystemMessage('');
            } else {
              setSystemMessage(data.error || 'Error uploading video.');
              setNewConfession((prev) => ({ ...prev, video: null }));
              setVideoPreview(null);
            }
          } catch (error) {
            console.error("Upload error:", error);
            setSystemMessage('Error uploading video. Please try again.');
            setNewConfession((prev) => ({ ...prev, video: null }));
            setVideoPreview(null);
          }
        }
      };
    }
  };

  // Retrieve any previously uploaded temporary image for the user
  useEffect(() => {
    if (userProfile.referralCode) {
      fetch(`http://localhost:5000/api/confessions/temp-image?referralCode=${userProfile.referralCode}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.url) {
            setImagePreview(data.url);
            setNewConfession((prev) => ({ ...prev, file: data.url }));
          }
        })
        .catch((err) => console.error(err));
    }
  }, [userProfile.referralCode]);

  const submitConfession = async () => {
    const wordCount = newConfession.text.trim().split(/\s+/).length;
    if (wordCount < 50) {
      setSystemMessage('Confession must be at least 50 words.');
      return;
    }
    if (getTodayConfessionsCount() >= 1) {
      setSystemMessage('You can only upload 1 confession per day.');
      return;
    }
    if (
      (newConfession.file && typeof newConfession.file !== 'string') ||
      (newConfession.video && typeof newConfession.video !== 'string')
    ) {
      setSystemMessage('File conversion is in progress. Please wait a moment.');
      return;
    }
    if (newConfession.type === 'public' && !username) {
      setSystemMessage('Username not loaded yet. Please try again later.');
      return;
    }
    const confessionData = {
      text: newConfession.text,
      type: newConfession.type,
      user: userProfile.referralCode,
      status: 'pending'
    };
    if (newConfession.type === 'public') {
      confessionData.username = username;
    }
    if (newConfession.file) {
      confessionData.file = newConfession.file;
    }
    if (newConfession.video) {
      confessionData.video = newConfession.video;
    }
    try {
      const response = await fetch('http://localhost:5000/api/confessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(confessionData),
      });
      const result = await response.json();
      if (response.ok) {
        setSystemMessage('Confession submitted successfully! Awaiting admin approval.');
        setNewConfession({ text: '', type: 'public', file: null, video: null });
        setImagePreview(null);
        setVideoPreview(null);
        setPendingConfessions((prev) => [result.confession, ...prev]);
      } else {
        setSystemMessage(result.error || 'Error submitting confession.');
      }
    } catch (error) {
      console.error('Error submitting confession:', error);
      setSystemMessage('Error submitting confession. Please try again.');
    }
  };

  // ─── OTHER CONFESSION FUNCTIONS ─────────────────────────────
  const upvoteConfession = (id) => {
    let error = '';
    const newConfessions = confessions.map((conf) => {
      const confId = conf._id || conf.id;
      if (confId === id) {
        if (!conf.upvotedBy) {
          conf.upvotedBy = [];
        }
        if (conf.upvotedBy.includes(userProfile.referralCode)) {
          error = 'You have already upvoted this confession.';
          return conf;
        }
        const updatedUpvotedBy = [...conf.upvotedBy, userProfile.referralCode];
        return { ...conf, votes: conf.votes + 1, upvotedBy: updatedUpvotedBy };
      }
      return conf;
    });
    if (error) {
      setVoteErrors((prev) => ({ ...prev, [id]: error }));
      return;
    } else {
      setVoteErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
    setConfessions(newConfessions);
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: 'update',
        confessions: newConfessions,
      });
    }
    
    fetch(`http://localhost:5000/api/confessions/${id}/upvote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: userProfile.referralCode }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setVoteErrors((prev) => ({ ...prev, [id]: data.error }));
          console.error(data.error);
        } else {
          const updatedConfession = data.confession;
          setConfessions((prevConfessions) =>
            prevConfessions.map((conf) =>
              (conf._id || conf.id) === id ? updatedConfession : conf
            )
          );
        }
      })
      .catch((err) => {
        console.error('Error updating vote on backend:', err);
      });
  };

  const deleteConfession = async (id) => {
    const conf = confessions.find((c) => (c._id || c.id) === id);
    if (!conf) return;
    if (!adminVerified && conf.user !== userProfile.referralCode) {
      setSystemMessage('You can only delete your own confessions.');
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/confessions/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: userProfile.referralCode, admin: adminVerified }),
      });
      const result = await response.json();
      if (response.ok) {
        if (freeDeletionsToday < 1) {
          setFreeDeletionsToday(freeDeletionsToday + 1);
          setUserProfile((prev) => ({
            ...prev,
            tokenBalance: prev.tokenBalance + 10,
          }));
          setSystemMessage('Confession deleted for free. You earned 10 SNV2.');
        } else {
          setSystemMessage('Confession deleted after payment.');
        }
        fetchConfessions();
        if (channelRef.current) {
          channelRef.current.postMessage({ type: 'update', confessions: [] });
        }
      } else {
        setSystemMessage(result.error || 'Error deleting confession.');
      }
    } catch (error) {
      console.error('Error deleting confession:', error);
      setSystemMessage('Error deleting confession. Please try again.');
    }
  };

  const boostConfession = (id) => {
    const conf = confessions.find((c) => (c._id || c.id) === id);
    if (!conf) return;
    const wordCount = conf.text.trim().split(/\s+/).length;
    if (wordCount < 150 || (!conf.file && !conf.video)) {
      setSystemMessage('Boost requires at least 150 words and an image or video attached.');
      return;
    }
    if (!window.confirm('Boosting this confession costs 0.01 SOL. Proceed?')) {
      return;
    }
    const boostedUntil = Date.now() + 24 * 60 * 60 * 1000;
    const newConfessions = confessions.map((c) =>
      (c._id || c.id) === id ? { ...c, boostedUntil } : c
    );
    setConfessions(newConfessions);
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: 'update',
        confessions: newConfessions,
      });
    }
    setSystemMessage('Confession boosted for 24 hours.');
  };

  const reportConfession = (id) => {
    let alreadyReported = false;
    const newConfessions = confessions.map((c) => {
      const confId = c._id || c.id;
      if (confId === id) {
        if (!c.reportedBy) {
          c.reportedBy = [];
        }
        if (c.reportedBy.includes(userProfile.referralCode)) {
          setSystemMessage('You have already reported this confession.');
          alreadyReported = true;
          return c;
        }
        const updatedReportedBy = [...c.reportedBy, userProfile.referralCode];
        const newReports = (c.reports || 0) + 1;
        if (newReports >= 5) {
          return {
            ...c,
            reports: newReports,
            hidden: true,
            reportedBy: updatedReportedBy,
          };
        }
        return { ...c, reports: newReports, reportedBy: updatedReportedBy };
      }
      return c;
    });
    if (alreadyReported) return;
    setConfessions(newConfessions);
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: 'update',
        confessions: newConfessions,
      });
    }
    setSystemMessage('Confession reported.');
    
    fetch(`http://localhost:5000/api/confessions/${id}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: userProfile.referralCode }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setSystemMessage(data.error);
          console.error(data.error);
        } else {
          const updatedConfession = data.confession;
          setConfessions((prevConfessions) =>
            prevConfessions.map((conf) =>
              (conf._id || conf.id) === id ? updatedConfession : conf
            )
          );
        }
      })
      .catch((err) => {
        console.error('Error reporting confession on backend:', err);
      });
  };

  const handleDeleteAllConfessions = async () => {
    if (!window.confirm('Are you sure you want to delete ALL confessions?')) return;
    try {
      const response = await fetch('http://localhost:5000/api/confessions/all-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin: true }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete all confessions.');
      }
      setSystemMessage(data.message);
      fetchConfessions();
    } catch (error) {
      setSystemMessage("Error deleting all confessions: " + error.message);
    }
  };

  const handleApproveConfession = (index) => {
    const confession = pendingConfessions[index];
    fetch(`http://localhost:5000/api/confessions/approve/${confession._id || confession.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin: true }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.text().then(text => { throw new Error(text || `HTTP error ${res.status}`) });
        }
        return res.json();
      })
      .then((data) => {
        console.log('Confession approved:', data);
        let approvedConfession = data.confession;
        if (!approvedConfession.file && confession.file) {
          approvedConfession.file = confession.file;
        }
        setPendingConfessions((prev) => prev.filter((_, i) => i !== index));
        setConfessions((prev) => [approvedConfession, ...prev]);
        setSystemMessage('Confession approved successfully.');
      })
      .catch((err) => {
        console.error('Error approving confession:', err);
        setSystemMessage('Error approving confession: ' + err.message);
      });
  };

  const handleDeclineConfession = (index) => {
    const confession = pendingConfessions[index];
    fetch(`http://localhost:5000/api/confessions/decline/${confession._id || confession.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin: true }),
    })
      .then((res) => res.json())
      .then(() => {
        setPendingConfessions((prev) => prev.filter((_, i) => i !== index));
        setSystemMessage('Confession declined.');
      })
      .catch((err) => {
        console.error('Error declining confession:', err);
        setSystemMessage('Error declining confession.');
      });
  };

  useEffect(() => {
    let badges = [];
    if (confessions.length >= 10) {
      badges.push('Honest Soul');
    }
    if (confessions.some((c) => c.votes >= 100)) {
      badges.push('Community Favorite');
    }
    const sorted = [...confessions].sort((a, b) => b.votes - a.votes);
    if (sorted.slice(0, 10).length >= 3) {
      badges.push('Top Confessor');
    }
    setUserProfile((prev) => ({ ...prev, badges }));
  }, [confessions]);

  useEffect(() => {
    if (confessions.length >= 10) {
      setRewardInfo({
        dailyRewards: 100,
        weeklyRewards: 300,
        dailyTop: 5,
        weeklyTop: 5,
      });
    } else {
      setRewardInfo({
        dailyRewards: 50,
        weeklyRewards: 150,
        dailyTop: 3,
        weeklyTop: 3,
      });
    }
  }, [confessions]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
  }, [imagePreview, videoPreview]);

  const close = () => {
    navigate('/');
  };

  const renderConfessions = () => {
    const approvedConfessions = confessions.filter(conf => conf.status !== 'pending');
    const sortedConfessions = [...approvedConfessions].sort((a, b) => {
      const aBoosted = a.boostedUntil && a.boostedUntil > Date.now() ? 1 : 0;
      const bBoosted = b.boostedUntil && b.boostedUntil > Date.now() ? 1 : 0;
      return bBoosted - aBoosted;
    });
    const totalPages = Math.ceil(sortedConfessions.length / confessionsPerPage);
    const startIndex = (currentPage - 1) * confessionsPerPage;
    const paginatedConfessions = sortedConfessions.slice(startIndex, startIndex + confessionsPerPage);
    return (
      <>
        {paginatedConfessions.map((conf) => (
          <div key={conf._id || conf.id} className="confession-card">
            {conf.hidden ? (
              <p>This confession is under review due to multiple reports.</p>
            ) : (
              <>
                <p>
                  <strong>
                    {conf.type === 'anonymous'
                      ? 'Anonymous Confession'
                      : `Confession by ${conf.username}`}
                  </strong>
                </p>
                <p>{conf.text}</p>
                {conf.file && (
                  <div className="confession-image centered-image">
                    <img
                      src={conf.file}
                      alt="Confession Attachment"
                      className="uploaded-image"
                      onClick={() => setSelectedImage(conf.file)}
                      onContextMenu={(e) => e.preventDefault()}
                      draggable="false"
                      style={{ cursor: 'pointer', maxWidth: '100%', maxHeight: '300px' }}
                    />
                  </div>
                )}
                {conf.video && (
                  <div className="confession-video">
                    <video
                      controls
                      width="250"
                      onContextMenu={(e) => e.preventDefault()}
                      onClick={() => setSelectedVideo(conf.video)}
                      style={{ cursor: 'pointer' }}
                      controlsList="nodownload"
                    >
                      <source src={conf.video} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}
                <div className="confession-actions">
                  <button onClick={() => upvoteConfession(conf._id || conf.id)}>Upvote</button>
                  <br />
                  <span>{conf.votes} votes</span>
                  {voteErrors[conf._id || conf.id] && (
                    <p className="error-message">{voteErrors[conf._id || conf.id]}</p>
                  )}
                  {(conf.user === userProfile.referralCode || adminVerified) && (
                    <button className="btn" onClick={() => deleteConfession(conf._id || conf.id)}>
                      Delete
                    </button>
                  )}
                  <button className="btn" onClick={() => boostConfession(conf._id || conf.id)}>
                    Boost
                  </button>
                  <button 
                    className="btn" 
                    onClick={() => reportConfession(conf._id || conf.id)}
                    disabled={conf.reportedBy && conf.reportedBy.includes(userProfile.referralCode)}
                  >
                    Report
                  </button>
                  {conf.reportedBy && conf.reportedBy.includes(userProfile.referralCode) ? (
                    <p className="report-status" style={{ color: 'green' }}>
                      Reported
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </div>
        ))}
        {totalPages > 1 && (
          <div className="pagination">
            <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button key={page} onClick={() => setCurrentPage(page)} className={currentPage === page ? 'active' : ''}>
                {page}
              </button>
            ))}
            <button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>
              Next
            </button>
          </div>
        )}
      </>
    );
  };

  const renderPendingConfessions = () => {
    return (
      <div className="pending-confessions-container">
        <h2>Pending Confessions for Approval</h2>
        {pendingConfessions.map((conf, index) => (
          <div key={conf._id || conf.id} className="pending-confession-item">
            <p>
              <strong>
                {conf.type === 'anonymous'
                  ? 'Anonymous Confession'
                  : `Confession by ${conf.username}`}
              </strong>
            </p>
            <p>{conf.text}</p>
            {conf.file && (
              <div className="pending-confession-image"
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  maxWidth: '100%',
                }}
              >
                <img
                  src={conf.file}
                  alt="Attached"
                  onClick={() => setSelectedImage(conf.file)}
                  onContextMenu={(e) => e.preventDefault()}
                  draggable="false"
                  style={{ cursor: 'pointer', maxWidth: '100%' }}
                />
              </div>
            )}
            {conf.video && (
              <div className="pending-confession-video">
                <video
                  controls
                  width="250"
                  onContextMenu={(e) => e.preventDefault()}
                  controlsList="nodownload"
                  onClick={() => setSelectedVideo(conf.video)}
                  style={{ cursor: 'pointer' }}
                >
                  <source src={conf.video} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
            <div className="pending-confession-actions">
              <button onClick={() => handleApproveConfession(index)} className="btn">Approve</button>
              <button onClick={() => handleDeclineConfession(index)} className="btn">Decline</button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="ConfessAndEarn-page">
      <div className="ConfessAndEarn-container">
        <span className="close-btn" onClick={close}>
          <span role="img" aria-label="cross mark">❌</span>
        </span>
        <br />
        {/* ADMIN CONTROLS (visible only when admin is verified) */}
        {adminVerified && (
          <>
            <button onClick={handleDeleteAllConfessions} className="btn">
              Delete All Confessions
            </button>
            <div className="admin-access-granted">
              <h3>Welcome Admin!</h3>
              <p>Your are allowed to DELETE any "CONFESSION" and also to DELETE ALL CONFESSIONS</p>
            </div>
          </>
        )}
        <h1>Confess & Earn</h1>
        <p>Share your confessions and earn SNV2 tokens based on community engagement!</p>
        {/* USER PROFILE DISPLAY */}
        <div className="user-profile">
          <p><strong>Username:</strong></p>
          <p style={{ color: '#ffeb3b', fontSize: 'larger' }}>
            <strong>{username ? username : 'Not Logged In'}</strong>
          </p>
          <p><strong>Token Balance:</strong> {userProfile.tokenBalance} SNV2</p>
          <p>
            <strong>Badges:</strong>{' '}
            {userProfile.badges.length > 0 ? userProfile.badges.join(', ') : 'None'}
          </p>
          <p><strong>Your ID:</strong> {userProfile.referralCode}</p>
        </div>
        <div className="confession-form">
          <textarea
            name="text"
            placeholder="Write your confession here (minimum 50 words)"
            value={newConfession.text}
            onChange={handleInputChange}
            className="input-text"
          ></textarea>
          <p>{newConfession.text.trim().split(/\s+/).length} / 50 words</p>
          <h5>Post Confession "Public" or "Anonymous"</h5>
          <select
            name="type"
            value={newConfession.type}
            onChange={handleInputChange}
            className="input-select btn"
            style={{ textAlign: 'center' }}
          >
            <option value="public">Public</option>
            <option value="anonymous">Anonymous</option>
          </select>
          <h4>Upload Image</h4>
          <input type="file" accept="image/*" onChange={handleFileChange} className="upload-file" />
          {imagePreview && (
            <div className="image-preview" style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
              <img
                src={imagePreview}
                alt="Preview"
                onContextMenu={(e) => e.preventDefault()}
                draggable="false"
                style={{ maxWidth: '200px', maxHeight: '200px' }}
              />
            </div>
          )}
          <h4>Upload Video</h4>
          <input type="file" accept="video/*" onChange={handleVideoChange} className="upload-file" />
          {videoPreview && (
            <div className="video-preview">
              <video
                width="250"
                controls
                onContextMenu={(e) => e.preventDefault()}
                controlsList="nodownload"
              >
                <source src={videoPreview} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          )}
          <button onClick={submitConfession} className="btn">Submit Confession</button>
          {systemMessage && <p className="system-message">{systemMessage}</p>}
        </div>

        {/* Pending Confessions Panel (visible only to admin) */}
        {adminVerified && pendingConfessions.length > 0 && renderPendingConfessions()}

        <div className="reward-info">
          <h3 style={{ color: '#ffeb3b' }}>Reward Information</h3>
          <p>Top {rewardInfo.dailyTop} confessions daily earn {rewardInfo.dailyRewards} SNV2 each!</p>
          <p>Top {rewardInfo.weeklyTop} confessions weekly earn {rewardInfo.weeklyRewards} SNV2 each!</p>
        </div>
        <div className="referral-section">
          <h3 style={{ color: '#ffeb3b' }}>Referral Program</h3>
          <p>Your referral code: {userProfile.referralCode}</p>
          <button className="btn" onClick={() => {
              navigator.clipboard.writeText(userProfile.referralCode);
              setSystemMessage('Referral code copied!');
            }}>
            Copy Referral Code
          </button>
        </div>
        <div className="confession-feed">
          <h3 style={{ color: '#ffeb3b' }}>Confession Feed</h3>
          {confessions.length > 0 ? renderConfessions() : <p>No confessions yet. Be the first to confess!</p>}
        </div>
        <div className="confession-status">
          <h3 style={{ color: '#ffeb3b' }}>Status</h3>
          <p>You have submitted {getTodayConfessionsCount()} out of 1 allowed confession today.</p>
        </div>

        {/* Image Modal */}
        {selectedImage && (
          <div className="image-modal" onClick={() => setSelectedImage(null)}>
            <div className="image-modal-content">
              <img
                src={selectedImage}
                alt="Full-size"
                onContextMenu={(e) => e.preventDefault()}
                draggable="false"
              />
            </div>
          </div>
        )}

        {/* Video Modal */}
        {selectedVideo && (
          <div className="video-modal" onClick={() => setSelectedVideo(null)} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}>
            <div className="video-modal-content" onClick={(e) => e.stopPropagation()} style={{
              maxWidth: '90%',
              maxHeight: '90%',
            }}>
              <video
                src={selectedVideo}
                controls
                autoPlay
                onContextMenu={(e) => e.preventDefault()}
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ConfessAndEarn;
