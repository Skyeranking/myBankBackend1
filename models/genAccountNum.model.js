
const mongoose = require('mongoose')

const GenAccountSchema = mongoose.Schema({
  genAccount: {
    type: Number,
    default: 10000000,
  },
});

const GenAccountModel = mongoose.model('genAccount', GenAccountSchema);

const getNextAccountNumber = async () => {
  let record = await GenAccountModel.findOne();
  if (!record) {
    record = await GenAccountModel.create({ genAccount: 10000001 });
  } else {
    record.genAccount += 1;
    await record.save();
  }

  return record.genAccount;
};

module.exports= getNextAccountNumber
module.exports = GenAccountModel

