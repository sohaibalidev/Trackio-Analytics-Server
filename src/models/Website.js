const mongoose = require("mongoose");

const websiteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  domain: {
    type: String,
    required: true,
  },
  apiKey: {
    type: String,
    required: true,
    unique: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  scriptTag: {
    type: String,
  },
});

websiteSchema.methods.generateScriptTag = function () {
  return `<script>
    (function(a, n, a, l, y, t, i, c, s) {
      s = document.createElement('script');
      s.src = 'http://localhost:5000/tracker.js?key=${this.apiKey}';
      s.async = 1;
      document.head.appendChild(s);
    })();
  </script>`;
};

websiteSchema.pre("save", function (next) {
  if (this.isModified("apiKey") || this.isNew) {
    this.scriptTag = this.generateScriptTag();
  }
  next();
});

const Website = mongoose.model("Website", websiteSchema);
module.exports = Website;
