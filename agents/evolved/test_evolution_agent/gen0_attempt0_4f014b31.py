
def agent_improved(business_type, description):
    '''Improved agent with error handling'''
    if not business_type or not description:
        raise ValueError("business_type and description required")

    return f"Enhanced spec for {business_type}: {description}"

def validate_input(data):
    '''Validate input data'''
    if data is None:
        return False
    return True
