import React from 'react';
import './contact.css';

const ContactAndSupport = () => {
  return (
    <div className="contact-page">
      <div className="contact-container">
        <h1>Contact and Support</h1>
        <h4>Get in Touch with Us</h4>
        
        {/* Contact Form Section */}
        <div className="contact-form">
          <h3>Contact Us</h3>
          <p>
            If you have any questions, concerns, or need assistance, please fill out the contact form below and we will get back to you as soon as possible.
          </p>
          <form>
            <label>Name:</label>
            <input type="text" name="name" placeholder="Your Name" required />
            
            <label>Email:</label>
            <input type="email" name="email" placeholder="Your Email" required />
            
            <label>Subject:</label>
            <input type="text" name="subject" placeholder="Subject" required />
            
            <label>Message:</label>
            <textarea name="message" placeholder="Your Message" required></textarea>
            
            <button type="submit">Send Message</button>
          </form>
        </div>
        
        {/* Support Information Section */}
        <div className="support-info">
          <h3>Support Information</h3>
          <p>
            For immediate assistance, you can also reach us via:
          </p>
          <p>Email: <a href="mailto:support@example.com">support@example.com</a></p>
          <p>Phone: <a href="tel:+1234567890">+1234567890</a></p>
          <p>Social Media: 
            <a href="https://facebook.com/support">Facebook</a> | 
            <a href="https://twitter.com/support">Twitter</a>
          </p>
        </div>
        
        {/* Cookie Notice Section */}
        <div className="cookie-notice">
          <h3>Cookie Notice</h3>
          <p>
            Our website uses cookies to ensure you get the best experience. By continuing to use our site, you agree to our use of cookies.
          </p>
          <button>Accept Cookies</button>
        </div>
        
        {/* Footer Section */}
        <footer>
          <p>© {new Date().getFullYear()} [Project Name]. All rights reserved.</p>
          <p><a href="/privacy-policy">Privacy Policy</a> | <a href="/terms-and-conditions">Terms and Conditions</a></p>
        </footer>
      </div>
    </div>
  );
};

export default ContactAndSupport;
