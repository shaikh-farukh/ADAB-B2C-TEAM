import Joi from 'joi';

export const idParamSchema = {
  params: Joi.object({
    id: Joi.number().integer().required().messages({
      'number.base': 'Order ID must be a number',
      'number.integer': 'Order ID must be an integer',
      'any.required': 'Order ID is required'
    })
  })
};

export const updateStatusSchema = {
  params: idParamSchema.params,
  body: Joi.object({
    status: Joi.string().valid('pending', 'accepted', 'processing', 'ready_for_dispatch', 'dispatched', 'delivered', 'rejected').required(),
    notes: Joi.string().allow('', null).optional()
  })
};

export const rejectOrderSchema = {
  params: idParamSchema.params,
  body: Joi.object({
    rejection_reason: Joi.string().trim().min(1).required().messages({
      'string.empty': 'Rejection reason is required',
      'any.required': 'Rejection reason is required'
    })
  })
};

export const markShippedSchema = {
  params: idParamSchema.params,
  body: Joi.object({
    tracking_number: Joi.string().allow('', null).optional(),
    shipping_provider: Joi.string().allow('', null).optional(),
    notes: Joi.string().allow('', null).optional()
  })
};

export const dispatchSchema = {
  params: idParamSchema.params,
  body: Joi.object({
    transporter_name: Joi.string().allow('', null).optional(),
    vehicle_number: Joi.string().allow('', null).optional(),
    tracking_number: Joi.string().allow('', null).optional(),
    dispatch_date: Joi.date().iso().allow('', null).optional(),
    notes: Joi.string().allow('', null).optional()
  })
};
