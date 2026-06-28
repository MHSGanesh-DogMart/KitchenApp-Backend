import express, { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yamljs';

// Detailed OpenAPI spec matching user requirements
const adminSpec = yaml.parse(`
openapi: 3.0.0
info:
  title: Padosi (KitchenApp) API Documentation
  version: 1.0.0
  description: API documentation for Padosi Customer, Partner/Kitchen, and Admin apps.
servers:
  - url: http://13.207.196.137
    description: AWS production server
  - url: http://localhost:5000
    description: Local development server
tags:
  - name: User API
    description: Endpoints for the Padosi Customer / User Application
  - name: Kitchen API
    description: Endpoints for the Padosi Partner / Kitchen Application
  - name: Admin API
    description: Endpoints for the Padosi Operations & Admin Web Panel
  - name: default
    description: Core platform utility endpoints
paths:
  /health:
    get:
      tags:
        - default
      summary: Verify API service status
      responses:
        '200':
          description: API is healthy
  /api/user/auth/otp/send:
    post:
      tags:
        - User API
      summary: Send OTP code to a customer's mobile number
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - mobileNumber
              properties:
                mobileNumber:
                  type: string
                  example: "9876543210"
      responses:
        '200':
          description: OTP sent successfully
  /api/user/auth/otp/verify:
    post:
      tags:
        - User API
      summary: Verify customer OTP — creates the account (name + email) on first login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - mobileNumber
                - otp
                - name
              properties:
                mobileNumber:
                  type: string
                  example: "9876543210"
                otp:
                  type: string
                  example: "1234"
                name:
                  type: string
                  example: "Ravi Kumar"
                email:
                  type: string
                  example: "ravi@example.com"
                fcmToken:
                  type: string
      responses:
        '200':
          description: OTP verified — account created/logged in, returns token and user
  /api/user/me:
    get:
      tags:
        - User API
      summary: Get the authenticated customer's own profile (id from token)
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Profile retrieved
    put:
      tags:
        - User API
      summary: Update the authenticated customer's own profile (id from token)
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                email:
                  type: string
                dob:
                  type: string
                  example: "1998-07-14"
                profilePicUrl:
                  type: string
      responses:
        '200':
          description: Profile updated
  /api/user/home:
    get:
      tags:
        - User API
      summary: Customer home feed — greeting name + nearby kitchens + today's menu, optional cuisine filter
      security:
        - bearerAuth: []
      parameters:
        - name: lat
          in: query
          required: true
          schema:
            type: number
          description: Customer latitude (required; sorts kitchens by distance)
        - name: lng
          in: query
          required: true
          schema:
            type: number
          description: Customer longitude (required)
        - name: cuisineId
          in: query
          schema:
            type: string
          description: Filter kitchens by cuisine (omit to show all)
      responses:
        '200':
          description: Home feed — { cuisines, cooks, dishes }
  /api/user/kitchens:
    get:
      tags:
        - User API
      summary: List live kitchens (paginated; optional lat/lng + cuisineId)
      security:
        - bearerAuth: []
      parameters:
        - name: lat
          in: query
          schema:
            type: number
        - name: lng
          in: query
          schema:
            type: number
        - name: cuisineId
          in: query
          schema:
            type: string
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: Array of kitchens
  /api/user/kitchens/{id}:
    get:
      tags:
        - User API
      summary: Kitchen details by id
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - name: lat
          in: query
          schema:
            type: number
        - name: lng
          in: query
          schema:
            type: number
      responses:
        '200':
          description: Kitchen details
  /api/user/kitchens/{id}/menu:
    get:
      tags:
        - User API
      summary: A kitchen's available menu (dishes)
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Array of available dishes for the kitchen
  /api/user/dishes:
    get:
      tags:
        - User API
      summary: List all available dishes (paginated; optional cuisineId)
      security:
        - bearerAuth: []
      parameters:
        - name: cuisineId
          in: query
          schema:
            type: string
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: Array of dishes (each with cookId + cookName)
  /api/user/dishes/{id}:
    get:
      tags:
        - User API
      summary: Dish details by id + recommended products
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Dish details with a "recommended" array
  /api/user/wishlist:
    get:
      tags:
        - User API
      summary: Get the customer's wishlist (kitchens and/or dishes)
      security:
        - bearerAuth: []
      parameters:
        - name: type
          in: query
          schema:
            type: string
            enum: [kitchen, dish]
          description: Omit for both
      responses:
        '200':
          description: "{ kitchens: [...], dishes: [...] }"
    post:
      tags:
        - User API
      summary: Add a kitchen or dish to the wishlist
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [type, targetId]
              properties:
                type:
                  type: string
                  enum: [kitchen, dish]
                targetId:
                  type: string
      responses:
        '200':
          description: Added
  /api/user/wishlist/{type}/{targetId}:
    delete:
      tags:
        - User API
      summary: Remove a kitchen or dish from the wishlist
      security:
        - bearerAuth: []
      parameters:
        - name: type
          in: path
          required: true
          schema:
            type: string
            enum: [kitchen, dish]
        - name: targetId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Removed
  /api/user/upload:
    post:
      tags:
        - User API
      summary: Upload a customer profile image (multipart) → returns fileUrl
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                image:
                  type: string
                  format: binary
      responses:
        '200':
          description: Image uploaded — returns fileUrl
  /api/user/fcm-token:
    post:
      tags:
        - User API
      summary: Register/append this device's FCM token (supports multiple devices)
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - fcmToken
              properties:
                fcmToken:
                  type: string
                  example: "fcm_device_token_abc123"
      responses:
        '200':
          description: Token registered — returns the full fcmTokens array
  /api/user/logout:
    post:
      tags:
        - User API
      summary: Logout this device (removes its FCM token; client clears its JWT)
      security:
        - bearerAuth: []
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
              properties:
                fcmToken:
                  type: string
                  description: This device's token to drop so it stops receiving pushes
                  example: "fcm_device_token_abc123"
      responses:
        '200':
          description: Logged out successfully
  /api/user/account:
    delete:
      tags:
        - User API
      summary: Permanently delete the authenticated customer's account + data
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Account deleted successfully
  /api/user/cart:
    get:
      tags:
        - User Cart
      summary: Get the cart + server-computed bill (single kitchen)
      description: >
        Pass lat/lng + fulfillment as query params. Delivery fee + serviceable
        radius are computed server-side. The client never sends prices.
      security:
        - bearerAuth: []
      parameters:
        - in: query
          name: lat
          schema: { type: number }
        - in: query
          name: lng
          schema: { type: number }
        - in: query
          name: fulfillment
          schema: { type: string, enum: [delivery, pickup] }
      responses:
        '200':
          description: Cart with items, kitchen, distanceKm, serviceable + bill
    delete:
      tags:
        - User Cart
      summary: Clear the whole cart (unlocks kitchen + drops coupon)
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Empty cart
  /api/user/cart/add:
    post:
      tags:
        - User Cart
      summary: Add a dish to the cart
      description: >
        Returns 409 with code CART_KITCHEN_CONFLICT if the cart already has
        items from a different kitchen. Send force=true to clear + switch.
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [menuItemId]
              properties:
                menuItemId: { type: string }
                qty: { type: integer, example: 1 }
                force: { type: boolean, description: Clear existing cart from another kitchen and add }
                lat: { type: number }
                lng: { type: number }
                fulfillment: { type: string, enum: [delivery, pickup] }
      responses:
        '200':
          description: Updated cart + bill
        '409':
          description: CART_KITCHEN_CONFLICT — cart belongs to another kitchen
  /api/user/cart/increment:
    post:
      tags:
        - User Cart
      summary: Increment a line's quantity by 1
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [menuItemId]
              properties:
                menuItemId: { type: string }
      responses:
        '200':
          description: Updated cart + bill
  /api/user/cart/decrement:
    post:
      tags:
        - User Cart
      summary: Decrement a line by 1 (removes the line at 0; empties unlock kitchen)
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [menuItemId]
              properties:
                menuItemId: { type: string }
      responses:
        '200':
          description: Updated cart + bill
  /api/user/cart/item/{menuItemId}:
    delete:
      tags:
        - User Cart
      summary: Remove a line entirely
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: menuItemId
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Updated cart + bill
  /api/user/cart/coupon:
    post:
      tags:
        - User Cart
      summary: Apply a coupon to the cart
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [code]
              properties:
                code: { type: string, example: "FRESH50" }
      responses:
        '200':
          description: Updated cart + bill (with discount)
        '400':
          description: Invalid/expired/limit-reached coupon
    delete:
      tags:
        - User Cart
      summary: Remove the applied coupon
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Updated cart + bill
  /api/admin/users:
    get:
      tags:
        - Admin API
      summary: List all customers (User table)
      responses:
        '200':
          description: All customers
  /api/kitchen/auth/otp/send:
    post:
      tags:
        - Kitchen API
      summary: Send OTP code to a mobile number
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - mobileNumber
              properties:
                mobileNumber:
                  type: string
                  description: The mobile number to send the OTP code to
                  example: "9876543210"
      responses:
        '200':
          description: OTP sent successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  message:
                    type: string
        '400':
          description: Mobile number is required
  /api/kitchen/auth/otp/verify:
    post:
      tags:
        - Kitchen API
      summary: Verify OTP code and return authentication status & token
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - mobileNumber
                - otp
              properties:
                mobileNumber:
                  type: string
                  description: The mobile number to verify
                  example: "9876543210"
                otp:
                  type: string
                  description: The 4-digit verification code
                  example: "1234"
                fcmToken:
                  type: string
                  description: Optional FCM device push token to sync
                  example: "fcm_token_example_123"
      responses:
        '200':
          description: OTP verified successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  message:
                    type: string
                  data:
                    type: object
                    properties:
                      token:
                        type: string
                        nullable: true
                      isRegistered:
                        type: boolean
                      status:
                        type: string
                      cook:
                        type: object
                        nullable: true
        '400':
          description: Mobile number and OTP code are required
        '401':
          description: Invalid OTP code
  /api/kitchen/register:
    post:
      tags:
        - Kitchen API
      summary: Submit full kitchen/chef onboarding registration details
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - phone
                - name
              properties:
                name:
                  type: string
                  example: "Chef Hemanth"
                phone:
                  type: string
                  example: "9876543210"
                dob:
                  type: string
                  example: "1990-01-01"
                whatsapp:
                  type: string
                  example: "9876543210"
                altContact:
                  type: string
                  example: "9876543211"
                aadhaarNo:
                  type: string
                  example: "123456789012"
                panNo:
                  type: string
                  example: "ABCDE1234F"
                isVegOnly:
                  type: boolean
                  example: false
                hasExistingFssai:
                  type: boolean
                  example: true
                fssaiNumber:
                  type: string
                  example: "12345678901234"
                fssaiExpiry:
                  type: string
                  example: "2028-12-31"
                address:
                  type: string
                  example: "123, Street Name, Bangalore"
                kitchenName:
                  type: string
                  example: "Hemanth's Homely Foods"
                bannerUrl:
                  type: string
                  example: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600"
                about:
                  type: string
                  example: "Authentic homemade meals crafted with love and fresh ingredients."
                cuisines:
                  type: string
                  example: "North Indian, South Indian, Healthy"
                streetAddress:
                  type: string
                  example: "Flat 402, Royal Gardens"
                landmark:
                  type: string
                  example: "Near Central Library"
                city:
                  type: string
                  example: "Bangalore"
                state:
                  type: string
                  example: "Karnataka"
                pincode:
                  type: string
                  example: "560001"
                fssaiUrl:
                  type: string
                  example: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600"
                lat:
                  type: number
                  example: 12.971598
                lng:
                  type: number
                  example: 77.594562
                capacity:
                  type: integer
                  example: 20
                cutoffNotice:
                  type: string
                  example: "2 hours"
                packagingType:
                  type: string
                  example: "Bio-degradable Containers"
                deliveryMode:
                  type: string
                  example: "Self Delivery"
                meals:
                  type: object
                  description: Active meal types mapped to pricing
                  example: { "breakfast": 80, "lunch": 120, "dinner": 150 }
                weeklyOff:
                  type: array
                  items:
                    type: string
                  example: ["Sunday"]
                selfieUrl:
                  type: string
                  example: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600"
                aadhaarUrl:
                  type: string
                  example: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600"
                panUrl:
                  type: string
                  example: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600"
                cookingUrl:
                  type: string
                  example: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600"
                storageUrl:
                  type: string
                  example: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600"
                sinkUrl:
                  type: string
                  example: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600"
      responses:
        '200':
          description: Onboarding registration completed successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  message:
                    type: string
                  data:
                    type: object
                    properties:
                      token:
                        type: string
                      status:
                        type: string
                      cook:
                        type: object
        '400':
          description: Invalid request parameters or duplicate registration
  /api/kitchen/details:
    get:
      tags:
        - Kitchen API
      summary: Get current chef's onboarding registration details
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Chef onboarding details retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: object
                    properties:
                      cook:
                        type: object
        '401':
          description: Unauthorized
        '404':
          description: Cook profile not found
  /api/kitchen/reapply:
    post:
      tags:
        - Kitchen API
      summary: Reapply chef onboarding registration details (e.g. if rejected)
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  example: "Chef Hemanth"
                dob:
                  type: string
                  example: "1990-01-01"
                whatsapp:
                  type: string
                  example: "9876543210"
                altContact:
                  type: string
                  example: "9876543211"
                aadhaarNo:
                  type: string
                  example: "123456789012"
                panNo:
                  type: string
                  example: "ABCDE1234F"
                isVegOnly:
                  type: boolean
                  example: false
                hasExistingFssai:
                  type: boolean
                  example: true
                fssaiNumber:
                  type: string
                  example: "12345678901234"
                fssaiExpiry:
                  type: string
                  example: "2028-12-31"
                address:
                  type: string
                  example: "123, Street Name, Bangalore"
                kitchenName:
                  type: string
                  example: "Hemanth's Homely Foods"
                bannerUrl:
                  type: string
                  example: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600"
                about:
                  type: string
                  example: "Authentic homemade meals crafted with love and fresh ingredients."
                cuisines:
                  type: string
                  example: "North Indian, South Indian, Healthy"
                streetAddress:
                  type: string
                  example: "Flat 402, Royal Gardens"
                landmark:
                  type: string
                  example: "Near Central Library"
                city:
                  type: string
                  example: "Bangalore"
                state:
                  type: string
                  example: "Karnataka"
                pincode:
                  type: string
                  example: "560001"
                fssaiUrl:
                  type: string
                  example: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600"
                lat:
                  type: number
                  example: 12.971598
                lng:
                  type: number
                  example: 77.594562
                capacity:
                  type: integer
                  example: 20
                cutoffNotice:
                  type: string
                  example: "2 hours"
                packagingType:
                  type: string
                  example: "Bio-degradable Containers"
                deliveryMode:
                  type: string
                  example: "Self Delivery"
                meals:
                  type: object
                  description: Active meal types mapped to pricing
                  example: { "breakfast": 80, "lunch": 120, "dinner": 150 }
                weeklyOff:
                  type: array
                  items:
                    type: string
                  example: ["Sunday"]
                selfieUrl:
                  type: string
                  example: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600"
                aadhaarUrl:
                  type: string
                  example: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600"
                panUrl:
                  type: string
                  example: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600"
                cookingUrl:
                  type: string
                  example: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600"
                storageUrl:
                  type: string
                  example: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600"
                sinkUrl:
                  type: string
                  example: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600"
      responses:
        '200':
          description: Reapplied onboarding details successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  message:
                    type: string
                  data:
                    type: object
                    properties:
                      status:
                        type: string
                      cook:
                        type: object
        '401':
          description: Unauthorized
        '404':
          description: Cook profile not found
  /api/kitchen/upload:
    post:
      tags:
        - Kitchen API
      summary: Upload onboarding images/documents
      responses:
        '200':
          description: Image uploaded successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  fileName:
                    type: string
                  fileUrl:
                    type: string
  /api/kitchen/status:
    get:
      tags:
        - Kitchen API
      summary: Get the current cook onboarding/verification status
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Current cook status
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  status:
                    type: string
        '401':
          description: Unauthorized
        '404':
          description: Cook profile not found
  /api/kitchen/fcm-token:
    post:
      tags:
        - Kitchen API
      summary: Update cook FCM push notification token
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - fcmToken
              properties:
                fcmToken:
                  type: string
                  description: The new FCM push token
                  example: "fcm_token_example_456"
      responses:
        '200':
          description: FCM token updated successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  message:
                    type: string
        '400':
          description: FCM token is required
        '401':
          description: Unauthorized
  /api/kitchen/live-orders:
    get:
      tags:
        - Kitchen API
      summary: Get live orders for kitchen
      security:
        - bearerAuth: []
      responses:
        '200':
          description: List of live orders
  /api/admin/auth/login:
    post:
      tags:
        - Admin API
      summary: Admin login credentials check
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                password:
                  type: string
      responses:
        '200':
          description: Logged in successfully
  /api/admin/auth/forgot-password:
    post:
      tags:
        - Admin API
      summary: Admin request forgot password link
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
      responses:
        '200':
          description: Password reset request received
  /api/admin/dashboard/stats:
    get:
      tags:
        - Admin API
      summary: Fetch high-level admin dashboard statistics
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Dashboard statistics retrieved
  /api/admin/cooks/pending:
    get:
      tags:
        - Admin API
      summary: Get list of chefs awaiting FSSAI / identity verification
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Pending cooks list
  /api/admin/cooks:
    get:
      tags:
        - Admin API
      summary: Get all cooks filterable by status, query, city and pagination
      security:
        - bearerAuth: []
      parameters:
        - name: status
          in: query
          schema:
            type: string
        - name: page
          in: query
          schema:
            type: integer
        - name: limit
          in: query
          schema:
            type: integer
      responses:
        '200':
          description: List of cooks
  /api/admin/cooks/{id}:
    get:
      tags:
        - Admin API
      summary: Fetch specific cook profile details by ID
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Cook profile retrieved
    delete:
      tags:
        - Admin API
      summary: Delete a cook account
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Cook deleted successfully
  /api/admin/cooks/{id}/verify:
    post:
      tags:
        - Admin API
      summary: Approve or reject chef onboarding application
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Cook verified status updated
  /api/admin/cooks/{id}/fssai-update:
    post:
      tags:
        - Admin API
      summary: Update FSSAI details for a cook and set status to ACTIVE
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
      responses:
        '200':
          description: Cook FSSAI details updated
  /api/admin/payouts/run:
    post:
      tags:
        - Admin API
      summary: Execute weekly payouts run cycle manually
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Payouts run cycle executed successfully
  /api/admin/config:
    get:
      tags:
        - Admin API
      summary: Fetch current platform settings configuration
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Config settings retrieved
    put:
      tags:
        - Admin API
      summary: Update platform settings configuration
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
      responses:
        '200':
          description: Config settings updated
  /api/admin/coupons:
    get:
      tags:
        - Admin API
      summary: Get all coupons
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Coupons retrieved
    post:
      tags:
        - Admin API
      summary: Create new coupon
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
      responses:
        '201':
          description: Coupon created
  /api/admin/coupons/{code}:
    put:
      tags:
        - Admin API
      summary: Update coupon details
      security:
        - bearerAuth: []
      parameters:
        - name: code
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
      responses:
        '200':
          description: Coupon updated
    delete:
      tags:
        - Admin API
      summary: Delete coupon
      security:
        - bearerAuth: []
      parameters:
        - name: code
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Coupon deleted
  /api/admin/cuisines:
    get:
      tags:
        - Admin API
      summary: List all cuisines with optional search and active filter
      security:
        - bearerAuth: []
      parameters:
        - name: q
          in: query
          required: false
          schema:
            type: string
          description: Search term for name or description
        - name: isActive
          in: query
          required: false
          schema:
            type: boolean
          description: Filter by active status
      responses:
        '200':
          description: Cuisines list retrieved
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Cuisine'
    post:
      tags:
        - Admin API
      summary: Create a new cuisine
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - name
              properties:
                name:
                  type: string
                  example: North Indian
                description:
                  type: string
                  example: Rich gravies, bread, and tandoor dishes
                imageUrl:
                  type: string
                  example: https://example.com/north-indian.jpg
                isActive:
                  type: boolean
                  example: true
                sortOrder:
                  type: integer
                  example: 1
      responses:
        '201':
          description: Cuisine created successfully
        '400':
          description: Missing name or duplicate cuisine
  /api/admin/cuisines/{id}:
    get:
      tags:
        - Admin API
      summary: Get a single cuisine by ID
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Cuisine retrieved
        '404':
          description: Cuisine not found
    put:
      tags:
        - Admin API
      summary: Update a cuisine by ID
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                description:
                  type: string
                imageUrl:
                  type: string
                isActive:
                  type: boolean
                sortOrder:
                  type: integer
      responses:
        '200':
          description: Cuisine updated
        '404':
          description: Cuisine not found
    delete:
      tags:
        - Admin API
      summary: Delete a cuisine by ID
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Cuisine deleted
        '404':
          description: Cuisine not found
  /api/kitchen/cuisines:
    get:
      tags:
        - Kitchen API
      summary: Get list of active cuisines (for kitchen partner app)
      responses:
        '200':
          description: Active cuisines list
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Cuisine'
  /api/user/coupons:
    get:
      tags:
        - User API
      summary: Get usable coupons (active + not expired) for the customer app
      responses:
        '200':
          description: List of usable coupons
  /api/user/cuisines:
    get:
      tags:
        - User API
      summary: Get list of active cuisines (for customer app)
      responses:
        '200':
          description: Active cuisines list
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Cuisine'
  /api/kitchen/menu:
    get:
      tags:
        - Kitchen API
      summary: Get all menu items for the authenticated kitchen
      security:
        - bearerAuth: []
      responses:
        '200':
          description: List of this kitchen's menu items
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/MenuItem'
    post:
      tags:
        - Kitchen API
      summary: Add a new menu item to the authenticated kitchen
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - name
                - price
              properties:
                name:
                  type: string
                  example: Veg Thali
                price:
                  type: number
                  example: 120
                perDay:
                  type: integer
                  example: 20
                imageUrl:
                  type: string
                diet:
                  type: string
                  enum: [Veg, Non-veg, Vegan, Jain]
                  example: Veg
                spice:
                  type: string
                  enum: [Mild, Medium, Spicy, Extra spicy]
                  example: Medium
                eggless:
                  type: boolean
                  example: true
                portion:
                  type: string
                  example: 2 roti + dal + sabzi + rice
                ingredients:
                  type: string
                description:
                  type: string
                isAvailable:
                  type: boolean
                  example: true
      responses:
        '201':
          description: Menu item created
  /api/kitchen/menu/{id}:
    put:
      tags:
        - Kitchen API
      summary: Edit a menu item (must belong to the authenticated kitchen)
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                price:
                  type: number
                perDay:
                  type: integer
                imageUrl:
                  type: string
                diet:
                  type: string
                  enum: [Veg, Non-veg, Vegan, Jain]
                spice:
                  type: string
                  enum: [Mild, Medium, Spicy, Extra spicy]
                eggless:
                  type: boolean
                portion:
                  type: string
                ingredients:
                  type: string
                description:
                  type: string
                isAvailable:
                  type: boolean
      responses:
        '200':
          description: Menu item updated
    delete:
      tags:
        - Kitchen API
      summary: Delete a menu item by id (must belong to the authenticated kitchen)
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Menu item deleted
  /api/kitchen/menu/{id}/availability:
    patch:
      tags:
        - Kitchen API
      summary: Turn a menu item ON or OFF (availability)
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - isAvailable
              properties:
                isAvailable:
                  type: boolean
                  example: false
      responses:
        '200':
          description: Availability updated
components:
  schemas:
    Cuisine:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        description:
          type: string
        imageUrl:
          type: string
        isActive:
          type: boolean
        sortOrder:
          type: integer
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
    MenuItem:
      type: object
      properties:
        id:
          type: string
        cookId:
          type: string
        name:
          type: string
        price:
          type: number
        perDay:
          type: integer
        imageUrl:
          type: string
        diet:
          type: string
          enum: [Veg, Non-veg, Vegan, Jain]
        spice:
          type: string
          enum: [Mild, Medium, Spicy, Extra spicy]
        eggless:
          type: boolean
        portion:
          type: string
        ingredients:
          type: string
        description:
          type: string
        isAvailable:
          type: boolean
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
`);

export function setupAdminSwagger(app: Express) {
  const router = express.Router();
  router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(adminSpec));
  app.use(router);
}
