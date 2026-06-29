const Contact = require('../models/Contact');
const Job = require('../models/Job');

const getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find({ userId: req.user.id })
      .populate('jobIds', 'company title status')
      .sort({ lastContactDate: -1 });
    res.status(200).json(contacts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
};

const getContactById = async (req, res) => {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, userId: req.user.id })
      .populate('jobIds', 'company title status');
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.status(200).json(contact);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
};

const updateContact = async (req, res) => {
  try {
    const { name, email, phone, linkedinUrl, role, notes } = req.body;
    
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { name, email, phone, linkedinUrl, role } },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    if (notes) {
      contact.interactions.push({ type: 'notes_added', notes, date: new Date() });
      await contact.save();
    }

    res.status(200).json(contact);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update contact' });
  }
};

module.exports = { getContacts, getContactById, updateContact };
