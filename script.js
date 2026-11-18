/* ==========================================================================
   AEVON DIGITAL SOLUTIONS — INTERACTIVE CINEMA & PORTFOLIO CONTROLLER
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // ------------------------ 1. TOAST HELPER ------------------------
  const toastEl = document.getElementById('toastMsg');
  let toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  // ------------------------ 2. DRAG-TO-SCROLL ENGINE ------------------------
  function attachHorizontalDrag(trackEl, onScrollCallback) {
    if (!trackEl) return { wasDragged: () => false };

    let isDown = false;
    let startX = 0;
    let scrollStart = 0;
    let movedDistance = 0;

    trackEl.addEventListener('pointerdown', (e) => {
      if (trackEl.classList.contains('grid-mode')) return;
      if (e.target.closest('button')) return;
      isDown = true;
      movedDistance = 0;
      startX = e.pageX;
      scrollStart = trackEl.scrollLeft;
      trackEl.classList.add('is-dragging');
    });

    window.addEventListener('pointermove', (e) => {
      if (!isDown) return;
      const dx = e.pageX - startX;
      movedDistance = Math.max(movedDistance, Math.abs(dx));
      if (movedDistance > 4) {
        trackEl.scrollLeft = scrollStart - dx * 1.25;
      }
    });

    const stopDrag = () => {
      if (!isDown) return;
      isDown = false;
      trackEl.classList.remove('is-dragging');
      setTimeout(() => {
        movedDistance = 0;
      }, 60);
    };

    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);

    // Support Shift+Wheel or horizontal trackpad naturally; also gentle horizontal glide when wheeling horizontally
    trackEl.addEventListener('scroll', () => {
      if (onScrollCallback) onScrollCallback();
    }, { passive: true });

    return {
      wasDragged: () => movedDistance > 7
    };
  }

  // ------------------------ 3. PAUSE ALL INLINE VIDEOS HELPER ------------------------
  const videoCards = Array.from(document.querySelectorAll('.video-card'));
  const motionPlayerWrap = document.getElementById('motionPlayerWrap');
  const motionVideo = document.getElementById('motionVideo');

  function pauseAllInlineVideos(exceptVideo = null) {
    videoCards.forEach((card) => {
      const v = card.querySelector('video');
      if (v && v !== exceptVideo) {
        v.pause();
        card.classList.remove('is-playing');
      }
    });
    if (motionVideo && motionVideo !== exceptVideo) {
      motionVideo.pause();
      if (motionPlayerWrap) motionPlayerWrap.classList.remove('is-playing');
    }
  }

  // ------------------------ 4. AI VIDEO HORIZONTAL REEL (01 - 10) ------------------------
  const videoTrack = document.getElementById('videoTrack');
  const videoPrevBtn = document.getElementById('videoPrevBtn');
  const videoNextBtn = document.getElementById('videoNextBtn');
  const videoCounter = document.getElementById('videoCounter');
  const videoProgressWrap = document.getElementById('videoProgressWrap');
  const videoProgressFill = document.getElementById('videoProgressFill');
  const jumpPills = Array.from(document.querySelectorAll('#videoJumpPills .jump-pill'));

  function updateVideoTrackUI() {
    if (!videoTrack) return;
    const maxScroll = Math.max(1, videoTrack.scrollWidth - videoTrack.clientWidth);
    const ratio = Math.min(1, Math.max(0, videoTrack.scrollLeft / maxScroll));
    if (videoProgressFill) {
      videoProgressFill.style.width = `${12 + ratio * 88}%`;
    }

    // Determine closest card to viewport left/center
    const trackRect = videoTrack.getBoundingClientRect();
    let bestIdx = 0;
    let bestDist = Infinity;
    videoCards.forEach((card, idx) => {
      const rect = card.getBoundingClientRect();
      const dist = Math.abs(rect.left - (trackRect.left + 48));
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    });

    const formatted = String(bestIdx + 1).padStart(2, '0');
    if (videoCounter) videoCounter.textContent = `${formatted} / 10`;
    jumpPills.forEach((pill, i) => pill.classList.toggle('active', i === bestIdx));
  }

  const videoDragState = attachHorizontalDrag(videoTrack, updateVideoTrackUI);

  if (videoPrevBtn && videoTrack) {
    videoPrevBtn.addEventListener('click', () => {
      videoTrack.scrollBy({ left: -360, behavior: 'smooth' });
    });
  }
  if (videoNextBtn && videoTrack) {
    videoNextBtn.addEventListener('click', () => {
      videoTrack.scrollBy({ left: 360, behavior: 'smooth' });
    });
  }

  if (videoProgressWrap && videoTrack) {
    videoProgressWrap.addEventListener('click', (e) => {
      const rect = videoProgressWrap.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const maxScroll = videoTrack.scrollWidth - videoTrack.clientWidth;
      videoTrack.scrollTo({ left: pct * maxScroll, behavior: 'smooth' });
    });
  }

  jumpPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const idx = Number(pill.dataset.index || 0);
      const targetCard = videoCards[idx];
      if (targetCard && videoTrack) {
        const offset = targetCard.offsetLeft - 28;
        videoTrack.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' });
      }
    });
  });

  // Video card interactions: hover preview, click play w/ sound, mute toggle, lightbox
  videoCards.forEach((card, idx) => {
    const vid = card.querySelector('video');
    const playBtn = card.querySelector('.video-center-play');
    const muteBtn = card.querySelector('.mute-toggle');
    const expandBtn = card.querySelector('.expand-video');

    if (!vid) return;

    // Ensure crisp poster frame on load
    vid.addEventListener('loadedmetadata', () => {
      if (vid.currentTime === 0) {
        vid.currentTime = 0.2;
      }
    }, { once: true });

    // Subtle silent preview on desktop hover when not actively playing
    card.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (!card.classList.contains('is-playing')) {
        vid.muted = true;
        vid.play().catch(() => {});
      }
    });

    card.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (!card.classList.contains('is-playing')) {
        vid.pause();
      }
    });

    const toggleCardPlay = () => {
      if (videoDragState.wasDragged()) return;
      if (card.classList.contains('is-playing')) {
        vid.pause();
        card.classList.remove('is-playing');
      } else {
        pauseAllInlineVideos(vid);
        vid.muted = false;
        card.classList.add('is-playing', 'is-unmuted');
        vid.play().catch(() => {
          // Fallback if browser requires muted first
          vid.muted = true;
          card.classList.remove('is-unmuted');
          vid.play().catch(() => {});
        });
      }
    };

    if (playBtn) {
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCardPlay();
      });
    }

    card.addEventListener('click', (e) => {
      if (e.target.closest('.vid-icon-btn')) return;
      toggleCardPlay();
    });

    if (muteBtn) {
      muteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        vid.muted = !vid.muted;
        card.classList.toggle('is-unmuted', !vid.muted);
      });
    }

    if (expandBtn) {
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        pauseAllInlineVideos();
        openLightbox('video', idx);
      });
    }
  });

  // ------------------------ 5. AI IMAGES GALLERY & VIEW TOGGLE ------------------------
  const imageTrack = document.getElementById('imageTrack');
  const imgPrevBtn = document.getElementById('imgPrevBtn');
  const imgNextBtn = document.getElementById('imgNextBtn');
  const imageProgressWrap = document.getElementById('imageProgressWrap');
  const imageProgressFill = document.getElementById('imageProgressFill');
  const imageProgressOuter = document.getElementById('imageProgressOuter');
  const toggleImageViewBtn = document.getElementById('toggleImageViewBtn');
  const toggleImageViewLabel = document.getElementById('toggleImageViewLabel');
  const imageCards = Array.from(document.querySelectorAll('.image-card'));

  function updateImageTrackUI() {
    if (!imageTrack || imageTrack.classList.contains('grid-mode')) return;
    const maxScroll = Math.max(1, imageTrack.scrollWidth - imageTrack.clientWidth);
    const ratio = Math.min(1, Math.max(0, imageTrack.scrollLeft / maxScroll));
    if (imageProgressFill) {
      imageProgressFill.style.width = `${16 + ratio * 84}%`;
    }
  }

  const imageDragState = attachHorizontalDrag(imageTrack, updateImageTrackUI);

  if (imgPrevBtn && imageTrack) {
    imgPrevBtn.addEventListener('click', () => {
      imageTrack.scrollBy({ left: -380, behavior: 'smooth' });
    });
  }
  if (imgNextBtn && imageTrack) {
    imgNextBtn.addEventListener('click', () => {
      imageTrack.scrollBy({ left: 380, behavior: 'smooth' });
    });
  }

  if (imageProgressWrap && imageTrack) {
    imageProgressWrap.addEventListener('click', (e) => {
      const rect = imageProgressWrap.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const maxScroll = imageTrack.scrollWidth - imageTrack.clientWidth;
      imageTrack.scrollTo({ left: pct * maxScroll, behavior: 'smooth' });
    });
  }

  if (toggleImageViewBtn && imageTrack) {
    toggleImageViewBtn.addEventListener('click', () => {
      const isGrid = imageTrack.classList.toggle('grid-mode');
      if (toggleImageViewLabel) {
        toggleImageViewLabel.textContent = isGrid ? 'Horizontal View' : 'Grid View';
      }
      if (imgPrevBtn) imgPrevBtn.style.display = isGrid ? 'none' : 'grid';
      if (imgNextBtn) imgNextBtn.style.display = isGrid ? 'none' : 'grid';
      if (imageProgressOuter) imageProgressOuter.style.display = isGrid ? 'none' : 'block';
    });
  }

  imageCards.forEach((card, idx) => {
    card.addEventListener('click', () => {
      if (imageDragState.wasDragged()) return;
      openLightbox('image', idx);
    });
  });

  // ------------------------ 6. MOTION GRAPHICS PLAYER ------------------------
  const motionPlayBtn = document.getElementById('motionPlayBtn');
  const motionMuteBtn = document.getElementById('motionMuteBtn');
  const motionExpandBtn = document.getElementById('motionExpandBtn');
  const motionProgressBar = document.getElementById('motionProgressBar');
  const motionProgressFill = document.getElementById('motionProgressFill');

  if (motionVideo && motionPlayerWrap) {
    const toggleMotionPlay = () => {
      if (motionVideo.paused) {
        pauseAllInlineVideos(motionVideo);
        motionVideo.play().catch(() => {});
        motionPlayerWrap.classList.add('is-playing');
      } else {
        motionVideo.pause();
        motionPlayerWrap.classList.remove('is-playing');
      }
    };

    if (motionPlayBtn) {
      motionPlayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMotionPlay();
      });
    }

    motionPlayerWrap.addEventListener('click', (e) => {
      if (e.target.closest('.vid-icon-btn') || e.target.closest('.motion-progress')) return;
      toggleMotionPlay();
    });

    motionVideo.addEventListener('timeupdate', () => {
      if (motionVideo.duration && motionProgressFill) {
        const pct = (motionVideo.currentTime / motionVideo.duration) * 100;
        motionProgressFill.style.width = `${pct}%`;
      }
    });

    if (motionProgressBar) {
      motionProgressBar.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!motionVideo.duration) return;
        const rect = motionProgressBar.getBoundingClientRect();
        const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        motionVideo.currentTime = pct * motionVideo.duration;
      });
    }

    if (motionMuteBtn) {
      motionMuteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        motionVideo.muted = !motionVideo.muted;
        motionMuteBtn.style.opacity = motionVideo.muted ? '0.45' : '1';
      });
    }

    if (motionExpandBtn) {
      motionExpandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        pauseAllInlineVideos();
        openLightbox('motion', 0);
      });
    }
  }

  // ------------------------ 7. UNIVERSAL CINEMA LIGHTBOX ------------------------
  const lightbox = document.getElementById('mediaLightbox');
  const lightboxBackdrop = document.getElementById('lightboxBackdrop');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  const lightboxHolder = document.getElementById('lightboxMediaHolder');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxCategory = document.getElementById('lightboxCategory');

  let currentLightboxGroup = 'video';
  let currentLightboxIndex = 0;

  function renderLightboxItem() {
    if (!lightboxHolder) return;
    lightboxHolder.innerHTML = '';

    if (currentLightboxGroup === 'video') {
      const card = videoCards[currentLightboxIndex];
      if (!card) return;
      const src = card.dataset.src;
      const title = card.dataset.title || `AI Video #${currentLightboxIndex + 1}`;
      if (lightboxCategory) lightboxCategory.textContent = `AI VIDEO PRODUCTION · ${String(currentLightboxIndex + 1).padStart(2, '0')} OF ${videoCards.length}`;
      if (lightboxTitle) lightboxTitle.textContent = title;

      const v = document.createElement('video');
      v.src = src;
      v.controls = true;
      v.autoplay = true;
      v.playsInline = true;
      lightboxHolder.appendChild(v);

      if (lightboxPrev) lightboxPrev.style.visibility = 'visible';
      if (lightboxNext) lightboxNext.style.visibility = 'visible';
    } else if (currentLightboxGroup === 'image') {
      const card = imageCards[currentLightboxIndex];
      if (!card) return;
      const src = card.dataset.src;
      const title = card.dataset.title || 'AI Visual Design';
      const cat = card.dataset.category || 'AI DESIGN';
      if (lightboxCategory) lightboxCategory.textContent = cat;
      if (lightboxTitle) lightboxTitle.textContent = title;

      const img = document.createElement('img');
      img.src = src;
      img.alt = title;
      lightboxHolder.appendChild(img);

      if (lightboxPrev) lightboxPrev.style.visibility = 'visible';
      if (lightboxNext) lightboxNext.style.visibility = 'visible';
    } else if (currentLightboxGroup === 'motion') {
      if (lightboxCategory) lightboxCategory.textContent = 'ADOBE AFTER EFFECTS SHOWCASE';
      if (lightboxTitle) lightboxTitle.textContent = 'Motion Graphics Reel — Lahiru Thilakawardhana';

      const v = document.createElement('video');
      v.src = 'assets/videos/motion-graphics.mp4';
      v.controls = true;
      v.autoplay = true;
      v.playsInline = true;
      lightboxHolder.appendChild(v);

      if (lightboxPrev) lightboxPrev.style.visibility = 'hidden';
      if (lightboxNext) lightboxNext.style.visibility = 'hidden';
    }
  }

  function openLightbox(group, index) {
    if (!lightbox) return;
    currentLightboxGroup = group;
    currentLightboxIndex = index;
    renderLightboxItem();
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    if (lightboxHolder) lightboxHolder.innerHTML = '';
    document.body.style.overflow = '';
  }

  function stepLightbox(dir) {
    if (currentLightboxGroup === 'video') {
      currentLightboxIndex = (currentLightboxIndex + dir + videoCards.length) % videoCards.length;
      renderLightboxItem();
    } else if (currentLightboxGroup === 'image') {
      currentLightboxIndex = (currentLightboxIndex + dir + imageCards.length) % imageCards.length;
      renderLightboxItem();
    }
  }

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxBackdrop) lightboxBackdrop.addEventListener('click', closeLightbox);
  if (lightboxPrev) lightboxPrev.addEventListener('click', () => stepLightbox(-1));
  if (lightboxNext) lightboxNext.addEventListener('click', () => stepLightbox(1));

  window.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') stepLightbox(-1);
    if (e.key === 'ArrowRight') stepLightbox(1);
  });

  // ------------------------ 8. FLOATING DOCK SCROLL-SPY ------------------------
  const dockLinks = Array.from(document.querySelectorAll('.dock-link'));
  const observedSections = ['home', 'ai-videos', 'ai-images', 'motion', 'services', 'about', 'contact']
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  function updateActiveDock() {
    const scrollPos = window.scrollY + window.innerHeight * 0.36;
    let currentId = 'home';
    for (const sec of observedSections) {
      if (sec.offsetTop <= scrollPos) {
        currentId = sec.id;
      }
    }
    dockLinks.forEach((link) => {
      link.classList.toggle('active', link.dataset.section === currentId);
    });
  }

  window.addEventListener('scroll', updateActiveDock, { passive: true });
  updateActiveDock();

  // ------------------------ 9. CONTACT ACTIONS (COPY EMAIL + WHATSAPP/EMAIL BRIEF) ------------------------
  const copyEmailBtn = document.getElementById('copyEmailBtn');
  if (copyEmailBtn) {
    copyEmailBtn.addEventListener('click', () => {
      navigator.clipboard.writeText('lahirusupuntk555@gmail.com').then(() => {
        showToast('Email copied: lahirusupuntk555@gmail.com');
      }).catch(() => {
        showToast('lahirusupuntk555@gmail.com');
      });
    });
  }

  const briefForm = document.getElementById('projectBriefForm');
  const sendEmailBriefBtn = document.getElementById('sendEmailBriefBtn');

  function getBriefPayload() {
    const name = (document.getElementById('clientName')?.value || '').trim() || 'Prospective Client';
    const service = document.getElementById('projectService')?.value || 'Creative Project';
    const details = (document.getElementById('projectDetails')?.value || '').trim() || 'I would love to discuss a project with Aevon Digital Solutions.';
    return { name, service, details };
  }

  if (briefForm) {
    briefForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const { name, service, details } = getBriefPayload();
      const msg = `Hi Lahiru! 👋\n\n*Name/Brand:* ${name}\n*Service:* ${service}\n*Project Brief:* ${details}`;
      const waUrl = `https://wa.me/94776681037?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    });
  }

  if (sendEmailBriefBtn) {
    sendEmailBriefBtn.addEventListener('click', () => {
      const { name, service, details } = getBriefPayload();
      const subject = `Project Inquiry: ${service} — ${name}`;
      const body = `Hi Lahiru,\n\nName / Brand: ${name}\nService Needed: ${service}\n\nProject Details:\n${details}\n\nBest regards,\n${name}`;
      window.location.href = `mailto:lahirusupuntk555@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }

  // Initial UI sync
  updateVideoTrackUI();
  updateImageTrackUI();
});
