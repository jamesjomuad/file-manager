select
    `bookings`.`id`,
    `bookings`.`user_id`,
    `bookings`.`client_id`,
    `bookings`.`form_id`,
    `bookings`.`coupon_id`,
    `bookings`.`invoice_id`,
    `bookings`.`contact_id`,
    `bookings`.`stripe_payment_id`,
    `bookings`.`order_number`,
    `bookings`.`hash`,
    `bookings`.`contact_first_name`,
    `bookings`.`contact_last_name`,
    `bookings`.`contact_email`,
    `bookings`.`contact_phone`,
    `bookings`.`organisation`,
    `bookings`.`coupon_code`,
    `bookings`.`po_number`,
    `bookings`.`invoiced`,
    `bookings`.`subtotal`,
    `bookings`.`total`,
    `bookings`.`errors`,
    `bookings`.`created_at`,
    `bookings`.`updated_at`,
    `bookings`.`deleted_at`,
  (
    select
      count(*)
    from
      `enrolments`
      inner join `enrolment_student` on `enrolments`.`id` = `enrolment_student`.`enrolment_id`
    where
      `enrolment_student`.`role` = 'student'
      and `enrolments`.`booking_id` = `bookings`.`id`
  ) as `students_count`,
  (
    select
      count(*) > 0
      AND count(
        CASE
          WHEN enrolment_student.cancelled_at IS NULL
          AND (
            enrolment_student.enrolled = 0
            OR enrolment_student.enrolled IS NULL
          ) THEN 1
        END
      ) = 0
      AND count(
        CASE
          WHEN enrolment_student.cancelled_at IS NULL THEN 1
        END
      ) > 0
    from
      `enrolments`
      inner join `enrolment_student` on `enrolments`.`id` = `enrolment_student`.`enrolment_id`
    where
      `enrolment_student`.`role` = 'student'
      and `enrolments`.`booking_id` = `bookings`.`id`
  ) as `enrolled`,
  (
    select
      count(*) > 0
      AND count(
        CASE
          WHEN enrolment_student.cancelled_at IS NULL
          AND enrolment_student.enrolled = 1
          AND JSON_EXTRACT(enrolment_student.data, "$.ERROR") IS TRUE
          AND JSON_EXTRACT(enrolment_student.data, "$.DETAILS") LIKE "%already enrolled%" THEN 1
        END
      ) = count(
        CASE
          WHEN enrolment_student.cancelled_at IS NULL THEN 1
        END
      )
      AND count(
        CASE
          WHEN enrolment_student.cancelled_at IS NULL THEN 1
        END
      ) > 0
    from
      `enrolments`
      inner join `enrolment_student` on `enrolments`.`id` = `enrolment_student`.`enrolment_id`
    where
      `enrolment_student`.`role` = 'student'
      and `enrolments`.`booking_id` = `bookings`.`id`
  ) as `already_enrolled`,
  (
    select
      count(*)
    from
      `enrolments`
      inner join `enrolment_student` on `enrolments`.`id` = `enrolment_student`.`enrolment_id`
    where
      `enrolment_student`.`role` = 'student'
      and `enrolment_student`.`cancelled_at` is not null
      and `enrolments`.`booking_id` = `bookings`.`id`
  ) as `cancelled_count`,
  (
    select
      count(*) > 0
    from
      `enrolments`
    where
      `location` = 'Online'
      and `enrolments`.`booking_id` = `bookings`.`id`
  ) as `has_online`,
  (
    select
      count(*)
    from
      `enrolments`
    where
      `bookings`.`id` = `enrolments`.`booking_id`
  ) as `enrolments_count`
from
  `bookings`
where
  `bookings`.`deleted_at` is null
  and `bookings`.`created_at` >= DATE_SUB(NOW(), INTERVAL 30 DAY)
order by
  `id` desc
limit
  30 offset
  0

/*----------------------------------------------------------------*/\
select
    count(*)
from
    `bookings` 