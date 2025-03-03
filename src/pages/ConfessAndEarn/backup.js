import React, { useState, useEffect, useRef } from 'react';
import './confess.css';
import { useNavigate } from 'react-router-dom';

const ConfessAndEarn = () => {
  // ─── STATE: Username ─────────────────────────────
  const [username, setUsername] = useState('');

  // ─── USER PROFILE (Token Balance, Badges, Referral Code) ─────────────────────────────
  // If no userProfile is found in sessionStorage, create one with a temporary referralCode.
  const [userProfile, setUserProfile] = useState(() => {
    const saved = sessionStorage.getItem('userProfile');
    if (saved) {
      return JSON.parse(saved);
    } else {
      // Temporary referralCode; will be replaced once the user data is fetched.
      const referralCode =
        '' + Math.random().toString(36).substring(2, 8).toUpperCase();
      return { tokenBalance: 0, badges: [], referralCode };
    }
  });

  useEffect(() => {
    sessionStorage.setItem('userProfile', JSON.stringify(userProfile));
  }, [userProfile]);

  // ─── FETCH CURRENT USER DATA USING LOCALSTORAGE ─────────────────────────────
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
        setUserProfile((prev) => ({
          ...prev,
          username: data.username,
          // Using the user's _id as the referralCode; adjust if needed.
          referralCode: data._id,
        }));
      })
      .catch((err) => console.error('Error fetching user data:', err));
  }, []);

  // ─── FREE DELETION COUNT ─────────────────────────────────────────────────────────────
  const [freeDeletionsToday, setFreeDeletionsToday] = useState(0);

  // ─── CONFESSIONS (fetched from the server) ─────────────────────────────────────────────
  const [confessions, setConfessions] = useState([]);

  // ─── NEW CONFESSION STATE ───────────────────────────────────────────────────────────
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

  // ─── PAGINATION STATE ─────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const confessionsPerPage = 10;

  const navigate = useNavigate();

  // ─── BroadcastChannel Setup ─────────────────────────────────────────────────────────────
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

  // ─── FETCH CONFESSIONS FROM SERVER ─────────────────────────────────────────────
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

  // ─── COUNT TODAY'S CONFESSIONS FOR THE CURRENT USER ─────────────────────────────
  const getTodayConfessionsCount = () => {
    const today = new Date().toDateString();
    return confessions.filter(
      (conf) =>
        new Date(conf.timestamp).toDateString() === today &&
        conf.user === userProfile.referralCode
    ).length;
  };

  // ─── HANDLE INPUT CHANGE ───────────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewConfession({ ...newConfession, [name]: value });
  };

  // ─── HANDLE IMAGE FILE CHANGE ──────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!validImageTypes.includes(file.type)) {
        setSystemMessage('Only image files (JPEG, PNG, GIF) are allowed.');
        setNewConfession({ ...newConfession, file: null });
        setImagePreview(null);
        return;
      }
      setImagePreview(URL.createObjectURL(file));
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewConfession((prev) => ({ ...prev, file: reader.result }));
      };
      reader.readAsDataURL(file);
      setSystemMessage('');
    }
  };

  // ─── HANDLE VIDEO FILE CHANGE ──────────────────────────────────────────────────────
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
      videoElement.onloadedmetadata = () => {
        window.URL.revokeObjectURL(videoURL);
        if (videoElement.duration > 30) {
          setSystemMessage('Video must be at most 30 seconds.');
          setNewConfession({ ...newConfession, video: null });
          setVideoPreview(null);
        } else {
          setVideoPreview(videoURL);
          const reader = new FileReader();
          reader.onloadend = () => {
            setNewConfession((prev) => ({ ...prev, video: reader.result }));
          };
          reader.readAsDataURL(file);
          setSystemMessage('');
        }
      };
    }
  };

  // ─── SUBMIT CONFESSION (using server API) ─────────────────────────────────────────────
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
    // Build the payload.
    const confessionData = {
      text: newConfession.text,
      type: newConfession.type,
      user: userProfile.referralCode,
    };
    if (newConfession.type === 'public') {
      confessionData.username = username || 'Public';
    }
    if (newConfession.file) {
      confessionData.file = newConfession.file;
    }
    if (newConfession.video) {
      confessionData.video = newConfession.video;
    }
    console.log('Submitting confessionData:', confessionData);
    try {
      const response = await fetch('http://localhost:5000/api/confessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(confessionData),
      });
      const result = await response.json();
      if (response.ok) {
        setSystemMessage('Confession submitted successfully!');
        setNewConfession({ text: '', type: 'public', file: null, video: null });
        setImagePreview(null);
        setVideoPreview(null);
        fetchConfessions();
        if (channelRef.current) {
          channelRef.current.postMessage({
            type: 'update',
            confessions: result.confession,
          });
        }
      } else {
        setSystemMessage(result.error || 'Error submitting confession.');
      }
    } catch (error) {
      console.error('Error submitting confession:', error);
      setSystemMessage('Error submitting confession. Please try again.');
    }
  };

  // ─── UPVOTE CONFESSION ─────────────────────────────────────────────────────────────
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
  };

  // ─── DELETE CONFESSION ─────────────────────────────────────────────────────────────
  const deleteConfession = async (id) => {
    const conf = confessions.find((c) => (c._id || c.id) === id);
    if (!conf) return;
    if (conf.user !== userProfile.referralCode) {
      setSystemMessage('You can only delete your own confessions.');
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/confessions/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: userProfile.referralCode }),
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

  // ─── BOOST CONFESSION ─────────────────────────────────────────────────────────────
  const boostConfession = (id) => {
    const conf = confessions.find((c) => (c._id || c.id) === id);
    if (!conf) return;
    const wordCount = conf.text.trim().split(/\s+/).length;
    if (wordCount < 150 || (!conf.file && !conf.video)) {
      setSystemMessage(
        'Boost requires at least 150 words and an image or video attached.'
      );
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

  // ─── REPORT CONFESSION ─────────────────────────────────────────────────────────────
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
  };

  // ─── UPDATE BADGES ─────────────────────────────────────────────────────────────
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

  // ─── AUTO DELETE AT ROMANIA MIDNIGHT & RESET FREE DELETION COUNT ─────────────────────────────────────────────
  useEffect(() => {
    const scheduleRomaniaMidnightDeletion = () => {
      const now = new Date();
      const nowRomania = new Date(
        now.toLocaleString('en-US', { timeZone: 'Europe/Bucharest' })
      );
      const nextMidnight = new Date(nowRomania);
      nextMidnight.setHours(24, 0, 0, 0);
      console.log(
        'Time until next Romania midnight (ms):',
        nextMidnight.getTime() - nowRomania.getTime()
      );
      setTimeout(() => {
        console.log('Clearing confessions at Romania midnight');
        setConfessions([]);
        setFreeDeletionsToday(0);
        scheduleRomaniaMidnightDeletion();
      }, nextMidnight.getTime() - nowRomania.getTime());
    };
    scheduleRomaniaMidnightDeletion();
  }, []);

  // ─── AUTO DELETE INDIVIDUAL CONFESSIONS AFTER 24 HOURS ─────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      let toReward = 0;
      const filtered = confessions.filter((conf) => {
        if (!conf.rewarded && Date.now() - conf.timestamp >= 86400000) {
          toReward++;
          return false;
        }
        return true;
      });
      if (toReward > 0) {
        setUserProfile((prevProfile) => ({
          ...prevProfile,
          tokenBalance: prevProfile.tokenBalance + 10 * toReward,
        }));
        setConfessions(filtered);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [confessions]);

  // ─── AUTO DELETE IMAGE/VIDEO CONTENT AFTER 48 HOURS ─────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const updated = confessions.map((conf) => {
        if (Date.now() - conf.timestamp >= 172800000) {
          return { ...conf, file: null, video: null };
        }
        return conf;
      });
      setConfessions(updated);
    }, 60000);
    return () => clearInterval(interval);
  }, [confessions]);

  // ─── RENDER CONFESSIONS ─────────────────────────────────────────────────────────────
  const renderConfessions = () => {
    const sortedConfessions = [...confessions].sort((a, b) => {
      const aBoosted = a.boostedUntil && a.boostedUntil > Date.now() ? 1 : 0;
      const bBoosted = b.boostedUntil && b.boostedUntil > Date.now() ? 1 : 0;
      return bBoosted - aBoosted;
    });
    const totalPages = Math.ceil(sortedConfessions.length / confessionsPerPage);
    const startIndex = (currentPage - 1) * confessionsPerPage;
    const paginatedConfessions = sortedConfessions.slice(
      startIndex,
      startIndex + confessionsPerPage
    );

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
                      ? 'Anonymous Confession:'
                      : `${conf.username ? conf.username : 'Unknown'} Confession:`}
                  </strong>
                </p>
                <p>{conf.text}</p>
                {conf.file && (
                  <div className="confession-image">
                    <img
                      src={conf.file}
                      alt="Confession Attachment"
                      className="uploaded-image"
                      onClick={() => setSelectedImage(conf.file)}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                )}
                {conf.video && (
                  <div className="confession-video">
                    <video controls width="250">
                      <source src={conf.video} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}
                <div className="confession-actions">
                  <button onClick={() => upvoteConfession(conf._id || conf.id)}>
                    Upvote
                  </button>
                  <br />
                  <span>{conf.votes} votes</span>
                  {voteErrors[conf._id || conf.id] && (
                    <p className="error-message">
                      {voteErrors[conf._id || conf.id]}
                    </p>
                  )}
                  {conf.user === userProfile.referralCode && (
                    <button
                      className="btn"
                      onClick={() => deleteConfession(conf._id || conf.id)}
                    >
                      Delete
                    </button>
                  )}
                  <button
                    className="btn"
                    onClick={() => boostConfession(conf._id || conf.id)}
                  >
                    Boost
                  </button>
                  <button
                    className="btn"
                    onClick={() => reportConfession(conf._id || conf.id)}
                  >
                    Report
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={currentPage === page ? 'active' : ''}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </>
    );
  };

  // ─── UPDATE REWARD INFORMATION ─────────────────────────────────────────────────────
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

  // ─── CLEAN UP IMAGE/VIDEO PREVIEW URLS ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
  }, [imagePreview, videoPreview]);

  // ─── CLOSE FUNCTION ─────────────────────────────────────────────────────────────
  const close = () => {
    navigate('/');
  };

  return (
    <div className="ConfessAndEarn-page">
      <div className="ConfessAndEarn-container">
        <span className="close-btn" onClick={close}>
          <span role="img" aria-label="cross mark">
            ❌
          </span>
        </span>
        <h1>Confess & Earn</h1>
        <p>
          Share your confessions and earn SNV2 tokens based on community engagement!
        </p>

        {/* USER PROFILE DISPLAY */}
        <div className="user-profile">
          <p>
            <strong>Username:</strong>
          </p>
          <p style={{ color: '#ffeb3b', fontSize: 'larger' }}>
            <strong>{username ? username : 'Not Logged In'}</strong>
          </p>
          <p>
            <strong>Token Balance:</strong> {userProfile.tokenBalance} SNV2
          </p>
          <p>
            <strong>Badges:</strong>{' '}
            {userProfile.badges.length > 0 ? userProfile.badges.join(', ') : 'None'}
          </p>
          <p>
            <strong>Your ID:</strong> {userProfile.referralCode}
          </p>
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
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="upload-file"
          />
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Preview" />
            </div>
          )}

          <h4>Upload Video</h4>
          <input
            type="file"
            accept="video/*"
            onChange={handleVideoChange}
            className="upload-file"
          />
          {videoPreview && (
            <div className="video-preview">
              <video width="250" controls>
                <source src={videoPreview} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          <button onClick={submitConfession} className="btn">
            Submit Confession
          </button>

          {systemMessage && <p className="system-message">{systemMessage}</p>}
        </div>

        <div className="reward-info">
          <h3 style={{ color: '#ffeb3b' }}>Reward Information</h3>
          <p>
            Top {rewardInfo.dailyTop} confessions daily earn {rewardInfo.dailyRewards} SNV2 each!
          </p>
          <p>
            Top {rewardInfo.weeklyTop} confessions weekly earn {rewardInfo.weeklyRewards} SNV2 each!
          </p>
        </div>

        <div className="referral-section">
          <h3 style={{ color: '#ffeb3b' }}>Referral Program</h3>
          <p>Your referral code: {userProfile.referralCode}</p>
          <button
            className="btn"
            onClick={() => {
              navigator.clipboard.writeText(userProfile.referralCode);
              setSystemMessage('Referral code copied!');
            }}
          >
            Copy Referral Code
          </button>
        </div>

        <div className="confession-feed">
          <h3 style={{ color: '#ffeb3b' }}>Confession Feed</h3>
          {confessions.length > 0 ? renderConfessions() : <p>No confessions yet. Be the first to confess!</p>}
        </div>

        <div className="confession-status">
          <h3 style={{ color: '#ffeb3b' }}>Status</h3>
          <p>
            You have submitted {getTodayConfessionsCount()} out of 1 allowed confession today.
          </p>
        </div>

        {selectedImage && (
          <div className="image-modal" onClick={() => setSelectedImage(null)}>
            <div className="image-modal-content">
              <img src={selectedImage} alt="Full-size" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfessAndEarn;
